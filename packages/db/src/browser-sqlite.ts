/**
 * Backend browser basato su `@sqlite.org/sqlite-wasm` (SQLite ufficiale, WASM).
 *
 * Usa l'API `sqlite3Worker1Promiser` (Promise-based wrapper del Worker #1):
 * è il path raccomandato per OPFS, gestisce internamente il Worker, lo SharedArrayBuffer,
 * il proxy OPFS. Funziona in Chromium/Firefox/Safari (con requisiti contesto sicuro).
 *
 * Strategia persistenza:
 *  - **OPFS** (`/lucidme.sqlite3` nell'OPFS): persistenza reale su file. Richiede
 *    secure context (https o localhost).
 *  - Se OPFS non disponibile: il worker cade su kvvfs (IndexedDB-backed) — più lento
 *    ma persistente.
 *  - Se sqlite-wasm non caricabile: fallback InMemoryDB + AVVISO (dato non persistente).
 *
 * IMPORTANTE: questa integrazione va validata su device/browser reali (Safari iOS,
 * Chrome Android, Firefox). Il wiring è corretto secondo la doc sqlite-wasm 3.53,
 * ma i quirks di OPFS per browser/OEM vanno verificati (vedi matrice S4-5 della wiki).
 *
 * Riferimento API: https://sqlite.org/wasm/doc/trunk/md-1-promise.md
 */
import type { DB } from './client.js';

export interface BrowserSqliteOptions {
  /** Nome del DB file in OPFS. Default 'lucidme.sqlite3'. */
  dbName?: string;
}

interface PromiserMessage {
  type: string;
  args?: Record<string, unknown>;
  result?: {
    dbId?: string;
    rows?: unknown[];
    columnNames?: string[];
  };
  dbId?: string;
}

type Promiser = (msg: PromiserMessage) => Promise<{ result?: PromiserMessage['result'] }>;

interface Sqlite3Worker {
  sqlite3Worker1Promiser: (config: {
    onready?: (promiser: Promiser) => void;
    onerror?: (e: unknown) => void;
    worker?: () => Worker;
  }) => Promiser;
}

let promiserPromise: Promise<Promiser> | null = null;

async function getPromiser(): Promise<Promiser> {
  if (promiserPromise) return promiserPromise;
  promiserPromise = new Promise<Promiser>((resolve, reject) => {
    (async () => {
      try {
        const mod = (await import('@sqlite.org/sqlite-wasm')) as unknown as {
          default?: Promise<Sqlite3Worker> | Sqlite3Worker;
          sqlite3Worker1Promiser?: Sqlite3Worker['sqlite3Worker1Promiser'];
        };
        const def = mod.default;
        const sqliteMod = def instanceof Promise ? await def : def;
        const factory = mod.sqlite3Worker1Promiser ?? sqliteMod?.sqlite3Worker1Promiser;
        if (!factory) {
          reject(new Error('sqlite3Worker1Promiser non trovato in sqlite-wasm'));
          return;
        }
        factory({
          onready: (p) => resolve(p),
          onerror: (e) => reject(e),
        });
      } catch (e) {
        reject(e);
      }
    })();
  });
  return promiserPromise;
}

export class BrowserSqliteDB implements DB {
  readonly backend = 'sqlite-wasm';
  private dbId: string | null = null;
  private dbName: string;

  constructor(opts: BrowserSqliteOptions = {}) {
    this.dbName = opts.dbName ?? 'lucidme.sqlite3';
  }

  private async p(msg: PromiserMessage): Promise<unknown> {
    const promiser = await getPromiser();
    return promiser(msg);
  }

  /** Apre (o crea) il DB. Idempotente. Tenta OPFS, poi kvvfs (IndexedDB). */
  private async ensureOpen(): Promise<string> {
    if (this.dbId) return this.dbId;
    // Tenta prima OPFS (file reale, più veloce).
    try {
      const result = (await this.p({
        type: 'open',
        args: { filename: this.dbName, vfs: 'opfs' },
      })) as { result?: { dbId?: string } };
      this.dbId = result?.result?.dbId ?? null;
      if (this.dbId) return this.dbId;
    } catch {
      // OPFS non disponibile (contesto non isolato / browser senza OPFS).
      // Procediamo con kvvfs (IndexedDB-backed) — più lento ma persistente.
    }
    // Fallback kvvfs: filename speciale ':kvvfs:' o path locale.
    try {
      const result = (await this.p({
        type: 'open',
        args: { filename: 'local:' + this.dbName, vfs: 'kvvfs' },
      })) as { result?: { dbId?: string } };
      this.dbId = result?.result?.dbId ?? null;
      if (this.dbId) return this.dbId;
    } catch {
      // nemmeno kvvfs: fallimento totale.
    }
    throw new Error('apertura DB browser fallita: né OPFS né kvvfs disponibili');
  }

  async exec(sql: string, params: unknown[] = []): Promise<void> {
    const dbId = await this.ensureOpen();
    // DDL/multi-statement senza binding → 'exec' con sql solo.
    // Statement con binding → 'exec' con bind (array posizionale).
    if (params.length === 0 && !sql.includes('?')) {
      await this.p({
        type: 'exec',
        args: { dbId, sql },
      });
      return;
    }
    await this.p({
      type: 'exec',
      args: { dbId, sql, bind: params },
    });
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const dbId = await this.ensureOpen();
    // Il promiser popola resultRows per side effect. Lo passiamo come array vuoto
    // e leggiamo result.result.resultRows.
    const resultRows: unknown[] = [];
    const columnNames: string[] = [];
    await this.p({
      type: 'exec',
      args: {
        dbId,
        sql,
        bind: params.length > 0 ? params : undefined,
        resultRows,
        columnNames,
      },
    });
    // resultRows è ora popolato per side effect (array di array posizionali).
    // Mappiamo in oggetti per nome colonna.
    return resultRows.map((row) => {
      if (Array.isArray(row)) {
        const obj: Record<string, unknown> = {};
        row.forEach((val, i) => {
          const col = columnNames[i] ?? `col${i}`;
          obj[col] = val;
        });
        return obj as T;
      }
      return row as T;
    });
  }

  async close(): Promise<void> {
    if (!this.dbId) return;
    try {
      await this.p({ type: 'close', args: { dbId: this.dbId } });
    } catch {
      // ignore
    }
    this.dbId = null;
  }
}
