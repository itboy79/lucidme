/**
 * Backend Node basato su `better-sqlite3` — SQLite nativo per i test.
 *
 * Perché esiste: l'`InMemoryDB` stub implementa un *sottoinsieme* di SQL a mano
 * e salta FTS5/trigger. Testando contro SQLite vero validiamo migration 001
 * (FTS5 virtual table + trigger di sync) e il comportamento reale di search(),
 * transaction rollback, PRAGMA.
 *
 * Wrappa l'API SINCRONA di better-sqlite3 nell'interfaccia `DB` (async) — ogni
 * chiamata è wrap-pata in `Promise.resolve()` perché il codice di business parla
 * sempre async (anche in browser, dove wa-sqlite è async).
 *
 * Usa `:memory:` di default: ogni test ha un DB fresco e isolato. Per debugging
 * si può passare un path file.
 */
import type DatabaseType from 'better-sqlite3';
import type { DB } from './client.js';

export interface NodeSqliteOptions {
  /** Path del file DB. Default `:memory:` (DB volatile, ideale per test). */
  path?: string;
  /** Se true, logga ogni query su stderr (debug). Mai loggare i param. */
  verbose?: boolean;
}

export class NodeSqliteDB implements DB {
  private readonly db: DatabaseType.Database;
  readonly backend = 'better-sqlite3';

  constructor(opts: NodeSqliteOptions = {}) {
    // Import dinamico con require (CommonJS) — Vite non riesce a seguire
    // `require()` nello static analysis del bundle browser, quindi better-sqlite3
    // resta fuori dal graph web. In node/vitest funziona normalmente.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3') as typeof import('better-sqlite3');
    this.db = new Database(opts.path ?? ':memory:', {
      verbose: opts.verbose
        ? (msg: unknown) => {
            // Privacy §8.5.4: logghiamo solo lo statement SQL, mai i binding.
            // better-sqlite3 chiama verbose con la stringa SQL già resa (params inline)
            // quindi qui potremmo leakare. Per sicurezza logghiamo solo un marker.
            console.error('[NodeSqliteDB] exec');
            void msg;
          }
        : undefined,
    });
    // NOTA: FTS5 è richiesto dalla migration 001. Le prebuild ufficiali di
    // better-sqlite3 lo includono (SQLITE_ENABLE_FTS5). Se mancante, le migration
    // throweranno a runtime sul CREATE VIRTUAL TABLE — fallendo loud, non silent.
  }

  async exec(sql: string, params: unknown[] = []): Promise<void> {
    this.run(sql, params);
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  private run(sql: string, params: unknown[]): void {
    // Supporta multi-statement (es. migration con trigger + CREATE multipli)
    // better-sqlite3 `exec` non supporta binding; per statements con `?` usiamo prepare.
    const trimmed = sql.trim();
    if (params.length === 0 && !trimmed.includes('?')) {
      // Multi-statement DDL senza binding → exec nativa (gestisce trigger multipli).
      this.db.exec(sql);
      return;
    }
    const stmt = this.db.prepare(sql);
    stmt.run(...params);
  }

  /** Chiude il DB. Solo per test puliti. */
  close(): void {
    this.db.close();
  }

  /** Espone PRAGMA (utile per diagnostics/integrity_check). */
  pragma<T = Record<string, unknown>>(name: string): T[] {
    return this.db.pragma(name) as T[];
  }
}
