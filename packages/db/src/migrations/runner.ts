/**
 * Migration runner (§S2-2).
 *
 * - Traccia la versione applicata in `schema_version`.
 * - Applica le migration in ordine, ognuna dentro `BEGIN IMMEDIATE … COMMIT`.
 * - MAI distruttivo: tutte le nostre migration usano `CREATE … IF NOT EXISTS`.
 * - Idempotente: rieseguire `runMigrations` non fa nulla se già a versione max.
 *
 * Il SQL è inline (non `?raw`) per evitare complessità di build su bundler
 * diversi (vite/rollup/tsc). La source-of-truth è il file `.sql` a fianco;
 * questo modulo ne riporta una copia testualmente identica.
 */
import type { DB } from '../client.js';

export interface Migration {
  version: number;
  /** Nome/descrizione per log (mai contenuto utente). */
  name: string;
  sql: string;
}

/**
 * Lista delle migration. Aggiungere in fondo, versione crescente, MAI
 * modificare una migration già rilasciata (creare una nuova).
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: '001-init',
    sql: `CREATE TABLE IF NOT EXISTS dream (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  dreamed_on TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  emotion TEXT NOT NULL,
  lucidity INTEGER NOT NULL,
  seed TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_dream_dreamed_on ON dream(dreamed_on DESC);
CREATE TABLE IF NOT EXISTS dream_revision (
  dream_id TEXT NOT NULL,
  body TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  FOREIGN KEY (dream_id) REFERENCES dream(id)
);
CREATE TABLE IF NOT EXISTS dream_sign (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  auto_detected INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS dream_sign_hit (
  dream_id TEXT NOT NULL,
  dream_sign_id TEXT NOT NULL,
  PRIMARY KEY (dream_id, dream_sign_id),
  FOREIGN KEY (dream_id) REFERENCES dream(id),
  FOREIGN KEY (dream_sign_id) REFERENCES dream_sign(id)
);
CREATE VIRTUAL TABLE IF NOT EXISTS dream_fts USING fts5(title, body, content='dream', content_rowid='rowid');
CREATE TRIGGER IF NOT EXISTS dream_ai AFTER INSERT ON dream BEGIN
  INSERT INTO dream_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;
CREATE TRIGGER IF NOT EXISTS dream_ad AFTER DELETE ON dream BEGIN
  INSERT INTO dream_fts(dream_fts, rowid, title, body) VALUES('delete', old.rowid, old.title, old.body);
END;
CREATE TRIGGER IF NOT EXISTS dream_au AFTER UPDATE ON dream BEGIN
  INSERT INTO dream_fts(dream_fts, rowid, title, body) VALUES('delete', old.rowid, old.title, old.body);
  INSERT INTO dream_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;`,
  },
  {
    version: 2,
    name: '002-path',
    // PathProgress (§S3-3, §8.3). Copia testuale di `002-path.sql`.
    // Il vincolo "un giorno per giorno solare" è applicato nel repository
    // (PathRepo.canCompleteDay), non nello schema: dipende dal tempo, non
    // dalla struttura. user_id = 'local' fino allo Step 7 (account).
    sql: `CREATE TABLE IF NOT EXISTS path_progress (
  user_id TEXT,
  day INTEGER NOT NULL,
  completed_at TEXT NOT NULL,
  technique TEXT,
  PRIMARY KEY (user_id, day)
);
CREATE INDEX IF NOT EXISTS idx_path_progress_user_day
  ON path_progress(user_id, day);`,
  },
  {
    version: 3,
    name: '003-night',
    // Rituale serale + impostazioni sonno (§S4-1, §S4-2).
    // Copia testuale di `003-night.sql`.
    sql: `CREATE TABLE IF NOT EXISTS night_ritual (
  user_id TEXT NOT NULL DEFAULT 'local',
  date TEXT NOT NULL,
  mild_done INTEGER NOT NULL DEFAULT 0,
  tlr_done INTEGER NOT NULL DEFAULT 0,
  signs_done INTEGER NOT NULL DEFAULT 0,
  wbtb_time TEXT,
  PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT NOT NULL DEFAULT 'local',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);`,
  },
  {
    version: 4,
    name: '004-rc',
    // Reality check events (§S5-3). Copia testuale di `004-rc.sql`.
    sql: `CREATE TABLE IF NOT EXISTS reality_check_event (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  fired_at TEXT NOT NULL,
  acknowledged INTEGER,
  prompt_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_rc_event_fired
  ON reality_check_event(fired_at);`,
  },
];

/** Versione corrente dello schema (max tra le migration). */
export const SCHEMA_VERSION = MIGRATIONS.reduce((m, x) => Math.max(m, x.version), 0);

interface VersionRow {
  version: number;
}

/**
 * Applica le migration pendenti. Crea `schema_version` se assente, poi per ogni
 * migration con `version > current` la esegue in transazione.
 */
export async function runMigrations(db: DB): Promise<void> {
  // tabella di tracking (idempotente)
  await db.exec(
    'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)',
  );

  const rows = await db.query<VersionRow>('SELECT version FROM schema_version');
  // `rowExists` muta durante il loop: dopo il primo INSERT la riga c'è, e i
  // migration successivi devono UPDATE (non INSERT: la tabella non ha PK,
  // altrimenti accumuleremmo righe duplicate). Invarianta: una sola riga.
  let rowExists = rows.length > 0;
  const current = rowExists ? (rows[0]?.version ?? 0) : 0;

  const pending = MIGRATIONS.filter((m) => m.version > current);
  if (pending.length === 0) return; // già aggiornato

  for (const m of pending) {
    // Ogni migration è atomica: BEGIN IMMEDIATE … COMMIT (§S2-2).
    await db.exec('BEGIN IMMEDIATE');
    try {
      // Le singole istruzioni SQL vanno spezzate (SQLite exec non supporta
      // multi-statement in una chiamata sul nostro DB iface). Splittiamo sui ';'
      // di top-level. Nessuno statement contiene ';' dentro stringhe qui.
      for (const stmt of splitStatements(m.sql)) {
        if (stmt.trim()) await db.exec(stmt);
      }
      // aggiorna/registra versione: INSERT solo se la tabella era vuota,
      // altrimenti UPDATE (evita righe duplicate).
      if (rowExists) {
        await db.exec('UPDATE schema_version SET version = ?', [m.version]);
      } else {
        await db.exec('INSERT INTO schema_version (version) VALUES (?)', [m.version]);
        rowExists = true; // da qui in poi, UPDATE.
      }
      await db.exec('COMMIT');
    } catch (err) {
      // rollback e rilancia: la transazione non lascia stati parziali.
      await safeRollback(db);
      // Messaggio senza contenuto utente: solo nome migration + causa.
      throw new Error(
        `migration ${m.name} (v${m.version}) fallita: ${(err as Error).message}`,
      );
    }
  }
}

/** Rollback best-effort: ignora errori se non in transazione. */
async function safeRollback(db: DB): Promise<void> {
  try {
    await db.exec('ROLLBACK');
  } catch {
    /* no-op: fuori transazione */
  }
}

/**
 * Splitta uno script SQL in statement sui ';' di top-level. Supporta i
 * `BEGIN ... END;` dei trigger (non spezza sui ';' interni al body).
 *
 * Usato SOLO su SQL di migration (mai su transaction BEGIN IMMEDIATE, gestito
 * altrove). Qui ogni `BEGIN` apre il corpo di un trigger e ogni `END` lo chiude.
 */
export function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let depth = 0; // profondità BEGIN/END dei trigger
  const tokens = sql.match(/[A-Za-z_]+|[^A-Za-z_]+/g) ?? [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    buf += tok;
    if (tok !== undefined) {
      const upper = tok.toUpperCase();
      // `BEGIN` come parola intera apre un body di trigger; `BEGIN IMMEDIATE`
      // non compare mai nelle migration SQL (solo nel runner).
      if (upper === 'BEGIN') depth++;
      else if (upper === 'END') depth = Math.max(0, depth - 1);
      else if (tok.includes(';') && depth === 0) {
        out.push(buf.trim());
        buf = '';
      }
    }
    i++;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}
