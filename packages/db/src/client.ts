/**
 * Client SQLite astratto (§S2-2).
 *
 * Architettura a due backend:
 *  - **Browser (production)**: `wa-sqlite` con VFS OPFS (file sincrono), fallback
 *    a un VFS in memoria IndexedDB se OPFS non disponibile. Reale, supporta FTS5
 *    e trigger della migration 001.
 *  - **Node / test**: `InMemoryDB`, uno *stub* Map-based che implementa il
 *    **sottoinsieme SQL** usato dai repository (INSERT/SELECT/UPDATE/DELETE/
 *    BEGIN[ IMMEDIATE]/COMMIT/ROLLBACK/PRAGMA integrity_check). Ignora
 *    silenziosamente `CREATE VIRTUAL TABLE` (FTS5) e `CREATE TRIGGER` perché non
 *    servono ai test — `search` usa LIKE su title/body come fallback esplicito
 *    (vedi `DreamRepo.search`).
 *
 * `openDb()` rileva l'ambiente e ritorna il backend opportuno; `getDb()` cachea
 * il singleton. Tutta la logica di business parla solo dell'interfaccia `DB`,
 * quindi i test non dipendono dal backend reale.
 *
 * NOTA privacy (§8.5.4): nessun testo di sogno viene loggato qui. I parametri
 * SQL passano come binding; gli errori includono solo la query SQL, mai i valori.
 *
 * Vincolo pipeline: non possiamo `pnpm install` in questo step, quindi `wa-sqlite`
 * è referenziato dinamicamente (`await import`) solo nel path browser. Lo stub
 * in memoria ha zero dipendenze esterne e funziona ovunque.
 */
/** Interfaccia minima che ogni backend (wa-sqlite o stub) implementa. */
export interface DB {
  /** Esegue DDL/DML senza righe restituite. Lancia su errore. */
  exec(sql: string, params?: unknown[]): Promise<void>;
  /** Esegue una SELECT e restituisce le righe (oggetti snake_case). */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface OpenDbOptions {
  /**
   * Forza il backend:
   *  - `true`  → wa-sqlite + OPFS (browser).
   *  - `false` → InMemoryDB (test/node).
   *  - default → autodetect (wa-sqlite se `globalThis` è browser, altrimenti stub).
   */
  opfs?: boolean;
}

/**
 * Rileva se siamo in un ambiente browser con OPFS disponibile (production).
 * Conservative: in assenza di `window`/`document` o di `navigator.storage`,
 * restituisce false (→ stub in memoria, ideale per node/vitest).
 */
function hasOpfs(): boolean {
  if (typeof globalThis === 'undefined') return false;
  const g = globalThis as {
    window?: unknown;
    document?: unknown;
    navigator?: { storage?: { getDirectory?: unknown } };
  };
  return (
    typeof g.window !== 'undefined' &&
    typeof g.document !== 'undefined' &&
    typeof g.navigator?.storage?.getDirectory === 'function'
  );
}

/**
 * Factory. Apre (o crea) il database. In browser usa wa-sqlite via import
 * dinamico (così il bundle del db package non rompe node). In node ritorna lo
 * stub in memoria.
 */
export async function openDb(options: OpenDbOptions = {}): Promise<DB> {
  // Path Node/test: SQLite nativo via better-sqlite3. Vero FTS5, veri trigger,
  // vero rollback. Solo se non siamo in browser.
  if (!hasOpfs() && options.opfs !== true) {
    const { NodeSqliteDB } = await import('./node-sqlite.js');
    return new NodeSqliteDB({ path: ':memory:' });
  }
  const wantOpfs = options.opfs ?? hasOpfs();
  if (wantOpfs) {
    // Path browser/production: @sqlite.org/sqlite-wasm con OPFS (persistenza reale)
    // o fallback kvvfs (IndexedDB). Se sqlite-wasm non è caricabile, cadiamo sullo
    // stub in memoria AVVISANDO che i dati NON sopravvivono al reload (caso limite,
    // da non accettare in produzione — l'app lo segnala all'utente).
    try {
      const { BrowserSqliteDB } = await import('./browser-sqlite.js');
      const db = new BrowserSqliteDB({ dbName: 'lucidme.sqlite3' });
      await db.query<{ test: number }>('SELECT 1 as test'); // smoke init
      return db;
    } catch (e) {
      console.error(
        '[db] sqlite-wasm non inizializzabile in browser. ' +
          'I dati NON saranno persistenti — contesto non sicuro o browser non supportato.',
        e,
      );
      return new InMemoryDB();
    }
  }
  return new InMemoryDB();
}

let cached: DB | null = null;

/** Singleton. Cachea la prima apertura. Passa `options` solo alla prima chiamata. */
export async function getDb(options?: OpenDbOptions): Promise<DB> {
  if (cached) return cached;
  cached = await openDb(options);
  return cached;
}

/** Solo test: resetta il singleton cacheato. */
export function _resetDbCache(): void {
  cached = null;
}

// ---------------------------------------------------------------------------
// InMemoryDB — stub per node/test. Implementa il subset SQL usato dai repo.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

/** Parametro SQL inline (stringa quote-safe). */
function sqlLit(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** Sostituisce `?` con valori literal (usato per `CREATE TABLE ... DEFAULT 1`). */
function bind(sql: string, params: unknown[] | undefined): string {
  if (!params || params.length === 0) return sql;
  let out = '';
  let pi = 0;
  // eslint-disable-next-line @typescript-eslint/prefer-for-of -- indice + pi richiesti per sostituzione posizionale
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === '?') {
      out += sqlLit(params[pi]);
      pi++;
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Estrae i gruppi di cattura di un match come tupla tipata di `string`.
 * `noUncheckedIndexedAccess` rende `m[1]` → `string | undefined`; qui sappiamo
 * (per costruzione delle regex) che i gruppi catturati sono presenti quando il
 * match avviene. Chiamare SEMPRE dopo `if (!m) throw`.
 *
 * Uso: `const [a, b] = groups<[string, string]>(m)` — il type-arg dichiarato
 * fa sì che la destrutturazione produca `string` (non `string | undefined`).
 */
function groups<T extends string[]>(m: RegExpMatchArray): T {
  return m.slice(1) as unknown as T;
}

/**
 * Mini-parser SQL per il subset che usiamo. NON è un SQL engine generico:
 * riconosce solo gli statement emessi da `runner.ts`, `dream-repo.ts`,
 * `sign-repo.ts`, `backup.ts` e i test. Statement ignoti lanciano (fail fast).
 *
 * Transazioni: BEGIN[ IMMEDIATE] / COMMIT / ROLLBACK. Su eccezione durante una
 * transazione aperta (es. crash a metà), lo stato pre-transazione viene
 * ripristinato (rollback) — questo è ciò che testa `crash-recovery.test.ts`.
 */
export class InMemoryDB implements DB {
  private tables = new Map<string, Row[]>();
  /** Colonne PRIMARY KEY per tabella (per INSERT OR IGNORE / ON CONFLICT). */
  private pks = new Map<string, string[]>();
  /**
   * DEFAULT per colonna, per tabella (da CREATE TABLE / ALTER TABLE ADD COLUMN).
   * Applicati alle INSERT che omettono la colonna — coerente con SQLite reale
   * (es. `no_recall` dopo la migration 005).
   */
  private colDefaults = new Map<string, Row>();
  private txnSnapshot: Map<string, Row[]> | null = null;
  private inTxn = false;

  async exec(sql: string, params?: unknown[]): Promise<void> {
    const stmt = bind(sql.trim().replace(/;$/, ''), params).trim();
    if (stmt === '') return;

    const upper = stmt.toUpperCase();

    // --- DDL ignorato (FTS5/trigger non supportati dallo stub) ---
    if (upper.startsWith('CREATE VIRTUAL TABLE')) {
      // FTS5: lo stub fa search via LIKE. Ignora silenziosamente.
      return;
    }
    if (upper.startsWith('CREATE TRIGGER')) {
      return;
    }
    if (upper.startsWith('CREATE INDEX')) {
      return; // indici: lo stub è scan lineare, ok per i test
    }

    // --- CREATE TABLE ---
    if (upper.startsWith('CREATE TABLE')) {
      this.createTable(stmt);
      return;
    }

    // --- ALTER TABLE (ADD COLUMN, migration 005) ---
    if (upper.startsWith('ALTER TABLE')) {
      this.doAlterTable(stmt);
      return;
    }

    // --- Transazioni ---
    if (upper === 'BEGIN' || upper.startsWith('BEGIN IMMEDIATE')) {
      if (this.inTxn) throw new Error('nested transaction not supported');
      this.inTxn = true;
      // snapshot profondo per rollback
      this.txnSnapshot = this.snapshot();
      return;
    }
    if (upper === 'COMMIT') {
      if (!this.inTxn) throw new Error('COMMIT without BEGIN');
      this.inTxn = false;
      this.txnSnapshot = null;
      return;
    }
    if (upper === 'ROLLBACK') {
      this.rollback();
      return;
    }

    // --- PRAGMA ---
    if (upper.startsWith('PRAGMA')) {
      // integrity_check, user_version, table_info...: no-op per lo stub.
      return;
    }

    // --- INSERT ---
    if (upper.startsWith('INSERT')) {
      this.doInsert(stmt);
      return;
    }

    // --- UPDATE ---
    if (upper.startsWith('UPDATE')) {
      this.doUpdate(stmt);
      return;
    }

    // --- DELETE ---
    if (upper.startsWith('DELETE')) {
      this.doDelete(stmt);
      return;
    }

    throw new Error(`InMemoryDB: statement non supportato: ${stmt.slice(0, 60)}`);
  }

  async query<T = Row>(sql: string, params?: unknown[]): Promise<T[]> {
    const stmt = bind(sql.trim().replace(/;$/, ''), params).trim();
    const upper = stmt.toUpperCase();

    if (upper.startsWith('SELECT')) {
      return this.doSelect<T>(stmt);
    }
    if (upper.startsWith('PRAGMA')) {
      // integrity_check → 'ok' per coerenza con SQLite reale
      return [{ integrity_check: 'ok' }] as unknown as T[];
    }
    // Le query con COUNT/SUBSTR etc. sono SELECT; copriamo anche INSERT...RETURNING
    // non usato. Default: tratta come select.
    throw new Error(`InMemoryDB: query non supportata: ${stmt.slice(0, 60)}`);
  }

  // --- Snapshot / rollback (transazioni) ---

  private snapshot(): Map<string, Row[]> {
    const snap = new Map<string, Row[]>();
    for (const [k, rows] of this.tables) {
      snap.set(k, rows.map((r) => ({ ...r })));
    }
    return snap;
  }

  /** Ripristina lo snapshot pre-transazione. Esposto per test (crash-recovery). */
  rollback(): void {
    if (this.txnSnapshot) {
      this.tables = this.txnSnapshot;
      this.txnSnapshot = null;
    }
    this.inTxn = false;
  }

  /** True se c'è una transazione aperta. Solo test. */
  _inTransaction(): boolean {
    return this.inTxn;
  }

  // --- CREATE TABLE ---

  private createTable(stmt: string): void {
    // CREATE TABLE [IF NOT EXISTS] name ( col TYPE ..., PRIMARY KEY (a, b) )
    const m = stmt.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)\s*\(([\s\S]*)\)/i);
    if (!m) throw new Error(`InMemoryDB: CREATE TABLE malformato: ${stmt.slice(0, 60)}`);
    const [name, bodyRaw] = groups<[string, string]>(m);
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }
    this.recordDefaults(name, bodyRaw);
    // Estrai PRIMARY KEY: inline `col TYPE PRIMARY KEY` o `PRIMARY KEY (a, b)`.
    if (!this.pks.has(name)) {
      const pks: string[] = [];
      const inline = bodyRaw.match(/(\w+)\s+\w+(?:\([^)]*\))?\s+PRIMARY\s+KEY/i);
      if (inline) pks.push(groups<[string]>(inline)[0]);
      const composite = bodyRaw.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (composite) {
        for (const c of groups<[string]>(composite)[0].split(',')) {
          pks.push(c.trim());
        }
      }
      this.pks.set(name, pks);
    }
  }

  // --- ALTER TABLE ---

  /**
   * `ALTER TABLE name ADD COLUMN col TYPE [NOT NULL] [DEFAULT x]` (migration
   * 005: `no_recall`). Lo stub non ha schema: applica il backfill del DEFAULT
   * alle righe esistenti (coerente con SQLite reale) e registra il DEFAULT
   * per le INSERT future che omettono la colonna. Idempotente: se la colonna
   * è già presente non fa nulla.
   */
  private doAlterTable(stmt: string): void {
    const m = stmt.match(
      /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)\s+\w+(?:\([^)]*\))?([\s\S]*)$/i,
    );
    if (!m) throw new Error(`InMemoryDB: ALTER TABLE malformato: ${stmt.slice(0, 60)}`);
    const [table, col, rest] = groups<[string, string, string]>(m);
    const rows = this.tables.get(table);
    if (!rows) throw new Error(`InMemoryDB: tabella inesistente: ${table}`);

    const first = rows[0];
    if (first !== undefined && col in first) return; // colonna già presente

    // DEFAULT x (NULL | numero | 'stringa'); se omesso, NULL.
    const defM = rest.match(/DEFAULT\s+(NULL|-?\d+(?:\.\d+)?|'[^']*')/i);
    const def = defM ? this.evalValue(groups<[string]>(defM)[0]) : null;

    const defs = this.colDefaults.get(table) ?? {};
    defs[col] = def;
    this.colDefaults.set(table, defs);

    for (const r of rows) {
      if (!(col in r)) r[col] = def;
    }
  }

  /**
   * Estrae i `DEFAULT` dalle definizioni di colonna di un CREATE TABLE
   * (`col TYPE [NOT NULL] DEFAULT x`). Regex globale sul body: non serve lo
   * split sulle virgole (che romperebbe sui `PRIMARY KEY (a, b)`).
   */
  private recordDefaults(table: string, bodyRaw: string): void {
    const defs = this.colDefaults.get(table) ?? {};
    const re =
      /(\w+)\s+(?:INTEGER|TEXT|REAL|BLOB|NUMERIC)\s*(?:\([^)]*\))?(?:\s+NOT\s+NULL)?\s+DEFAULT\s+(NULL|'[^']*'|-?\d+(?:\.\d+)?)/gi;
    let m: RegExpExecArray | null = re.exec(bodyRaw);
    while (m !== null) {
      const [col, vRaw] = m.slice(1) as [string, string];
      defs[col] = this.evalValue(vRaw);
      m = re.exec(bodyRaw);
    }
    this.colDefaults.set(table, defs);
  }

  // --- INSERT ---

  private doInsert(stmt: string): void {
    // Formati supportati:
    //   INSERT [OR IGNORE] INTO name [(cols...)] VALUES (...)
    //   INSERT INTO name (...) VALUES (...) ON CONFLICT(col) DO UPDATE SET ...
    //   INSERT INTO name (...) VALUES (...) ON CONFLICT(col) DO NOTHING
    const ignore = /\bOR\s+IGNORE\b/i.test(stmt);
    const conflictM = stmt.match(
      /INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+(\w+)\s*(?:\(([^)]+)\))?\s*VALUES\s*\(([^)]*)\)\s*(?:ON\s+CONFLICT\s*\(([^)]+)\)\s+DO\s+(UPDATE\s+SET\s+([\s\S]*)|NOTHING))?/i,
    );
    if (!conflictM) throw new Error(`InMemoryDB: INSERT malformato: ${stmt.slice(0, 60)}`);
    const [table, colsRaw, valsRaw, conflictColsRaw, , setRaw] = groups<
      [string, string, string, string, string, string]
    >(conflictM);
    const rows = this.tables.get(table);
    if (!rows) throw new Error(`InMemoryDB: tabella inesistente: ${table}`);

    const vals = this.parseVals(valsRaw);
    let row: Row;
    if (colsRaw) {
      const cols = colsRaw.split(',').map((c) => c.trim());
      row = {};
      cols.forEach((c, i) => {
        row[c] = vals[i] ?? null;
      });
    } else {
      // senza lista colonne: ricostruisci dall'ordine (non usato dai nostri repo)
      row = { _v: vals };
    }

    // Colonne omesse → DEFAULT dichiarato in CREATE/ALTER (come SQLite reale).
    const defs = this.colDefaults.get(table);
    if (defs) {
      for (const k of Object.keys(defs)) {
        if (!(k in row)) row[k] = defs[k];
      }
    }

    // Conflict detection su PK o colonne ON CONFLICT(...).
    const conflictCols = conflictColsRaw
      ? conflictColsRaw.split(',').map((c) => c.trim())
      : (this.pks.get(table) ?? []);
    const existing = conflictCols.length
      ? rows.find((r) => conflictCols.every((c) => r[c] === row[c]))
      : undefined;

    if (existing) {
      if (ignore) {
        return; // OR IGNORE: salta
      }
      if (setRaw) {
        // ON CONFLICT DO UPDATE SET col = excluded.col | literal
        // Risolviamo ogni assegnamento: se il valore è `excluded.col`, usiamo
        // il valore della riga NUOVA (row), incl. null (?? NON scatta su null).
        const sets = this.parseSets(setRaw);
        for (const [k, vRaw] of sets) {
          const isExcluded = typeof vRaw === 'string' && /^excluded\.\w+$/i.test(vRaw);
          const val = isExcluded ? row[k] : vRaw;
          existing[k] = val;
        }
        return;
      }
      // ON CONFLICT DO NOTHING (o nessuna clausola ma PK match → in SQLite
      // sarebbe un errore; qui lo trattiamo come abort per coerenza test).
      return;
    }
    rows.push(row);
  }

  /** Parsa una lista di valori SQL: 'a', NULL, 1, 0, '2025-01-01T...' */
  private parseVals(raw: string): unknown[] {
    const out: unknown[] = [];
    let i = 0;
    while (i < raw.length) {
      while (i < raw.length && (raw[i] === ' ' || raw[i] === ',')) i++;
      if (i >= raw.length) break;
      if (raw[i] === "'") {
        // stringa con escape '' 
        i++;
        let s = '';
        while (i < raw.length) {
          if (raw[i] === "'" && raw[i + 1] === "'") {
            s += "'";
            i += 2;
          } else if (raw[i] === "'") {
            i++;
            break;
          } else {
            s += raw[i];
            i++;
          }
        }
        out.push(s);
      } else {
        // token fino a virgola/fine
        let t = '';
        while (i < raw.length && raw[i] !== ',') {
          t += raw[i];
          i++;
        }
        t = t.trim();
        if (t.toUpperCase() === 'NULL') out.push(null);
        else if (/^-?\d+$/.test(t)) out.push(Number(t));
        else if (/^-?\d+\.\d+$/.test(t)) out.push(Number(t));
        else out.push(t);
      }
    }
    return out;
  }

  // --- UPDATE ---

  private doUpdate(stmt: string): void {
    // UPDATE name SET col = val, col2 = val2 [WHERE col = val [AND col2 = val2]]
    const m = stmt.match(/UPDATE\s+(\w+)\s+SET\s+([\s\S]*?)(?:\s+WHERE\s+([\s\S]*))?$/i);
    if (!m) throw new Error(`InMemoryDB: UPDATE malformato: ${stmt.slice(0, 60)}`);
    const [table, setRaw, whereRaw] = groups<[string, string, string]>(m);
    const rows = this.tables.get(table);
    if (!rows) throw new Error(`InMemoryDB: tabella inesistente: ${table}`);

    const sets = this.parseSets(setRaw);
    const where = whereRaw ? this.parseWhere(whereRaw) : null;

    for (const r of rows) {
      if (!where || where(r)) {
        for (const [k, v] of sets) r[k] = v;
      }
    }
  }

  private parseSets(raw: string): [string, unknown][] {
    // col = val, col2 = val2  (val può essere NULL, numero, 'str')
    const sets: [string, unknown][] = [];
    // split su virgole al top-level (no parentesi nei nostri SET)
    const parts = raw.split(',');
    for (const p of parts) {
      const sm = p.match(/(\w+)\s*=\s*([\s\S]*)/);
      if (!sm) continue;
      const [col, vRaw] = groups<[string, string]>(sm);
      sets.push([col, this.evalValue(vRaw.trim())]);
    }
    return sets;
  }

  private evalValue(raw: string): unknown {
    if (raw.toUpperCase() === 'NULL') return null;
    if (raw.startsWith("'") && raw.endsWith("'")) {
      return raw.slice(1, -1).replace(/''/g, "'");
    }
    if (/^-?\d+$/.test(raw)) return Number(raw);
    if (/^-?\d+\.\d+$/.test(raw)) return Number(raw);
    return raw;
  }

  private parseWhere(raw: string): (r: Row) => boolean {
    // col = val [AND col2 = val2]   (solo AND, eq, supportiamo `IS NULL`)
    const conds: ((r: Row) => boolean)[] = [];
    const parts = raw.split(/\s+AND\s+/i);
    for (const part of parts) {
      const t = part.trim();
      const eq = t.match(/(\w+)\s*=\s*([\s\S]*)/);
      const isn = t.match(/(\w+)\s+IS\s+NULL/i);
      const isnn = t.match(/(\w+)\s+IS\s+NOT\s+NULL/i);
      if (eq) {
        const [col, vRaw] = groups<[string, string]>(eq);
        const val = this.evalValue(vRaw.trim());
        conds.push((r) => r[col] === val);
      } else if (isn) {
        const col = groups<[string]>(isn)[0];
        conds.push((r) => r[col] == null);
      } else if (isnn) {
        const col = groups<[string]>(isnn)[0];
        conds.push((r) => r[col] != null);
      } else {
        // condizione non riconosciuta → match-all (fail safe per i nostri test)
        conds.push(() => true);
      }
    }
    return (r) => conds.every((c) => c(r));
  }

  // --- DELETE ---

  private doDelete(stmt: string): void {
    // DELETE FROM name [WHERE ...]
    const m = stmt.match(/DELETE\s+FROM\s+(\w+)\s*(?:WHERE\s+([\s\S]*))?$/i);
    if (!m) throw new Error(`InMemoryDB: DELETE malformato: ${stmt.slice(0, 60)}`);
    const [table, whereRaw] = groups<[string, string]>(m);
    const rows = this.tables.get(table);
    if (!rows) throw new Error(`InMemoryDB: tabella inesistente: ${table}`);
    if (!whereRaw) {
      rows.length = 0;
      return;
    }
    const where = this.parseWhere(whereRaw);
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if (row !== undefined && where(row)) rows.splice(i, 1);
    }
  }

  // --- SELECT ---

  private doSelect<T>(stmt: string): T[] {
    // SELECT cols FROM name [WHERE ...] [ORDER BY col [ASC|DESC]] [LIMIT n]
    const m = stmt.match(
      /SELECT\s+([\s\S]*?)\s+FROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?(?:\s+WHERE\s+([\s\S]*?))?(?:\s+ORDER\s+BY\s+([\s\S]*?))?(?:\s+LIMIT\s+(\d+))?$/i,
    );
    if (!m) throw new Error(`InMemoryDB: SELECT malformato: ${stmt.slice(0, 80)}`);
    const [colsRaw, table, alias, whereRaw, orderRaw, limitRaw] = groups<
      [string, string, string, string, string, string]
    >(m);
    const rows = this.tables.get(table);
    if (!rows) throw new Error(`InMemoryDB: tabella inesistente: ${table}`);

    let result: Row[] = rows.map((r) => ({ ...r }));

    // JOIN su dream_sign_hit + dream_sign (usato da SignRepo.list via repo? no,
    // non serve qui; teniamo comunque un parser LIKE basilare per safety)
    if (/\bJOIN\b/i.test(stmt) || /\bMATCH\b/i.test(stmt)) {
      // Non usato dai nostri repo sullo stub (search usa LIKE).
      throw new Error('InMemoryDB: JOIN/MATCH non supportati dallo stub');
    }

    if (whereRaw) {
      // WHERE con LIKE supportato (per search fallback) oltre a eq/AND/IS NULL.
      const conds = this.parseWhereExtended(whereRaw);
      result = result.filter(conds);
    }

    if (orderRaw) {
      this.applyOrder(result, orderRaw);
    }

    if (limitRaw) {
      const lim = Number(limitRaw);
      result = result.slice(0, lim);
    }

    // Proiezione colonne
    const projection = this.resolveProjection(colsRaw, alias);
    if (projection === '*') {
      return result as unknown as T[];
    }
    return result.map((r) => {
      const out: Row = {};
      for (const [aliasName, expr] of projection) {
        out[aliasName] = this.evalSelectExpr(expr, r);
      }
      return out;
    }) as unknown as T[];
  }

  private resolveProjection(
    colsRaw: string,
    tableAlias: string | undefined,
  ): [string, string][] | '*' {
    void tableAlias; // riservato per proiezioni table.col future
    const c = colsRaw.trim();
    if (c === '*') return '*';
    const items = c.split(',').map((s) => s.trim());
    const out: [string, string][] = [];
    for (const it of items) {
      // supporta `col AS alias` o `table.col` (group1 = expr, group2 = alias)
      const asM = it.match(/([\w.*]+)\s+(?:AS\s+)?(\w+)/i);
      if (asM) {
        const [expr, aliasName] = groups<[string, string]>(asM);
        out.push([aliasName, expr]);
      } else {
        out.push([it, it]);
      }
    }
    return out;
  }

  private evalSelectExpr(expr: string, r: Row): unknown {
    const clean = expr.replace(/^\w+\./, ''); // strip table prefix
    return r[clean];
  }

  /** WHERE esteso: eq, IS [NOT] NULL, AND, col LIKE '%x%', (a LIKE ? OR b LIKE ?). */
  private parseWhereExtended(raw: string): (r: Row) => boolean {
    const conds: ((r: Row) => boolean)[] = [];
    const parts = raw.split(/\s+AND\s+/i);
    for (const part of parts) {
      const t = part.trim();
      // Pattern `(col LIKE 'x' OR col LIKE 'y')` (usato da DreamRepo.search fallback)
      const orLike = t.match(
        /\(\s*(\w+)\s+LIKE\s+'([^']*)'\s+OR\s+(\w+)\s+LIKE\s+'([^']*)'\s*\)/i,
      );
      const like = t.match(/(\w+)\s+LIKE\s+'([^']*)'/i);
      // Operatori di confronto (>=, <=, <>, !=, >, <, =) — checked PRIMA di `=`.
      // Usati da RCRepo.listRange (`fired_at >= ? AND fired_at <= ?`).
      const cmp = t.match(/(\w+)\s*(>=|<=|<>|!=|>|<|=)\s*([\s\S]*)/);
      const isn = t.match(/(\w+)\s+IS\s+NULL/i);
      const isnn = t.match(/(\w+)\s+IS\s+NOT\s+NULL/i);
      if (orLike) {
        const [c1, p1, c2, p2] = groups<[string, string, string, string]>(orLike);
        conds.push(
          (r) => likeMatch(String(r[c1] ?? ''), p1) || likeMatch(String(r[c2] ?? ''), p2),
        );
      } else if (like) {
        const [col, pat] = groups<[string, string]>(like);
        conds.push((r) => likeMatch(String(r[col] ?? ''), pat));
      } else if (isn) {
        const col = groups<[string]>(isn)[0];
        conds.push((r) => r[col] == null);
      } else if (isnn) {
        const col = groups<[string]>(isnn)[0];
        conds.push((r) => r[col] != null);
      } else if (cmp) {
        const [col, op, vRaw] = groups<[string, string, string]>(cmp);
        const val = this.evalValue(vRaw.trim());
        conds.push((r) => compareValues(r[col], op, val));
      } else {
        conds.push(() => true);
      }
    }
    return (r) => conds.every((c) => c(r));
  }

  private applyOrder(rows: Row[], orderRaw: string): void {
    // ORDER BY col [ASC|DESC]  (singola colonna; i nostri repo usano dreamed_on DESC)
    const m = orderRaw.trim().match(/(\w+)\s*(ASC|DESC)?/i);
    if (!m) return;
    const [col, dirRaw] = groups<[string, string]>(m);
    const dir = (dirRaw ?? 'ASC').toUpperCase();
    rows.sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      if (av === bv) return 0;
      if (av == null) return dir === 'DESC' ? -1 : 1;
      if (bv == null) return dir === 'DESC' ? 1 : -1;
      if (av < bv) return dir === 'DESC' ? 1 : -1;
      return dir === 'DESC' ? -1 : 1;
    });
  }
}

/** Match LIKE SQL: '%' = qualsiasi, '_' = 1 char, case-insensitive. */
function likeMatch(value: string, pattern: string): boolean {
  // costruisci regex da pattern LIKE
  let rx = '';
  for (const ch of pattern) {
    if (ch === '%') rx += '.*';
    else if (ch === '_') rx += '.';
    else rx += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${rx}$`, 'i').test(value);
}

/**
 * Confronto per operatori SQL (>=, <=, <>, !=, >, <, =). Parità di tipo per
 * stringhe/numeri; confronto "alla SQLite": numeri numericamente, stringhe
 * lessicograficamente (ISO timestamps sono lex-sortable → corretto per range).
 * `NULL` è trattato come minore di tutto (coerente con SQLite).
 */
function compareValues(a: unknown, op: string, b: unknown): boolean {
  if (a === null || a === undefined) {
    // In SQLite NULL confronti sono "unknown" → false tranne `IS [NOT] NULL`.
    return false;
  }
  if (op === '=') return a === b;
  if (op === '!=' || op === '<>') return a !== b;
  if (typeof a === 'number' && typeof b === 'number') {
    if (op === '>') return a > b;
    if (op === '<') return a < b;
    if (op === '>=') return a >= b;
    if (op === '<=') return a <= b;
  }
  // stringhe (o misto): confronto lessicografico via String()
  const sa = String(a);
  const sb = String(b);
  if (op === '>') return sa > sb;
  if (op === '<') return sa < sb;
  if (op === '>=') return sa >= sb;
  if (op === '<=') return sa <= sb;
  return false;
}
