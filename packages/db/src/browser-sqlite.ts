/**
 * Backend browser basato su `@sqlite.org/sqlite-wasm` (SQLite ufficiale, WASM).
 *
 * Usa l'**OO1 API diretta** (sqlite3.oo1.OpfsDb / DB) sul main thread — NON
 * l'API Worker1/Promiser (deprecata 2026-04-15, "actively discouraged" per
 * software non-toy secondo la doc ufficiale). L'oo1 API è la via raccomandata.
 *
 * Strategia persistenza:
 *  - **OPFS** (`sqlite3.oo1.OpfsDb`): persistenza reale su file. Richiede
 *    secure context (https o localhost). File: 'lucidme.sqlite3' nell'OPFS.
 *  - **kvvfs fallback** (`sqlite3.oo1.DB` con vfs kvvfs): persistenza via
 *    IndexedDB. Più lento ma funziona ovunque.
 *  - Se sqlite-wasm non caricabile: fallback InMemoryDB + AVVISO forte.
 *
 * Riferimento: https://sqlite.org/wasm/doc/trunk/api-oo1.md
 */
import type { DB } from './client.js';

export interface BrowserSqliteOptions {
  /** Nome del DB file. Default 'lucidme.sqlite3'. */
  dbName?: string;
}

interface Sqlite3Oo1Db {
  exec: (
    sql:
      | string
      | {
          sql: string;
          bind?: unknown[];
          resultRows?: unknown[];
          columnNames?: string[];
          rowMode?: 'array' | 'object' | 'stmt';
        },
  ) => void;
  prepare: (sql: string) => Sqlite3Stmt;
  close: () => void;
  filename: string;
}
interface Sqlite3Stmt {
  bind: (params: unknown[]) => void;
  step: () => boolean;
  get: <T = unknown>() => T;
  columnNames: () => string[];
  finalize: () => void;
  reset: () => void;
}

interface Sqlite3Module {
  oo1: {
    OpfsDb: new (filename: string, flags?: string) => Sqlite3Oo1Db;
    DB: new (filename: string, flags?: string, options?: { vfs?: string }) => Sqlite3Oo1Db;
  };
  capi: {
    SQLITE_ROW: number;
    SQLITE_DONE: number;
  };
}

let sqlite3Promise: Promise<Sqlite3Module> | null = null;

async function loadSqlite3(): Promise<Sqlite3Module> {
  if (sqlite3Promise) return sqlite3Promise;
  sqlite3Promise = (async () => {
    const mod = (await import('@sqlite.org/sqlite-wasm')) as unknown as {
      // default è `sqlite3InitModule`: una FUNZIONE che ritorna Promise<Sqlite3Module>.
      // Va chiamata (opzionalmente con config locateFile) e la sua Promise await-ata.
      default?: Sqlite3InitFn | Promise<Sqlite3Module> | Sqlite3Module;
    };
    const def = mod.default;
    if (!def) throw new Error('sqlite-wasm default export mancante');
    // Se è una funzione (sqlite3InitModule), chiamala per ottenere la Promise.
    if (typeof def === 'function') {
      const initFn = def as Sqlite3InitFn;
      return await initFn();
    }
    // Se è già una Promise, await. Se è già il modulo, usalo.
    return def instanceof Promise ? await def : def;
  })();
  return sqlite3Promise;
}

type Sqlite3InitFn = (config?: { locateFile?: (file: string) => string }) => Promise<Sqlite3Module>;

function opfsAvailable(): boolean {
  if (typeof navigator === 'undefined') return false;
  return typeof navigator.storage?.getDirectory === 'function';
}

export class BrowserSqliteDB implements DB {
  readonly backend = 'sqlite-wasm';
  private handle!: Sqlite3Oo1Db;
  private ready: Promise<void>;
  private readonly dbName: string;

  constructor(opts: BrowserSqliteOptions = {}) {
    this.dbName = opts.dbName ?? 'lucidme.sqlite3';
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    const sqlite3 = await loadSqlite3();
    // Tenta OPFS (file reale, persistente, performante). OpfsDb è disponibile
    // solo se il build include il supporto OPFS e il contesto lo permette.
    if (opfsAvailable() && typeof sqlite3.oo1.OpfsDb === 'function') {
      try {
        this.handle = new sqlite3.oo1.OpfsDb(this.dbName);
        return;
      } catch (e) {
        console.warn('[browser-sqlite] OPFS non disponibile, fallback kvvfs:', e);
      }
    }
    // Fallback kvvfs: usa localStorage come storage (filename speciale ':localStorage:').
    // Persistente tra reload/chiusura, più lento di OPFS ma funziona ovunque.
    try {
      this.handle = new sqlite3.oo1.DB(':localStorage:', 'c');
    } catch (e) {
      throw new Error('nessun backend SQLite browser disponibile: ' + String(e));
    }
  }

  private async ensureReady(): Promise<void> {
    await this.ready;
  }

  async exec(sql: string, params: unknown[] = []): Promise<void> {
    await this.ensureReady();
    // DDL/multi-statement senza binding → exec(string) nativa.
    if (params.length === 0 && !sql.includes('?')) {
      this.handle.exec(sql);
      return;
    }
    // Statement con binding → exec({sql, bind}).
    this.handle.exec({ sql, bind: params });
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    await this.ensureReady();
    const resultRows: unknown[] = [];
    const columnNames: string[] = [];
    this.handle.exec({
      sql,
      bind: params.length > 0 ? params : undefined,
      resultRows,
      columnNames,
      rowMode: 'array',
    });
    // resultRows è popolato per side-effect; rowMode 'array' → array posizionali.
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
    await this.ensureReady();
    try {
      this.handle.close();
    } catch {
      // ignore
    }
  }
}
