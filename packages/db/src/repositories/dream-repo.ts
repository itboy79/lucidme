/**
 * `DreamRepo` — repository per `Dream` (§S2-2, §8.3).
 *
 * Invarianti:
 *  - **Append-only + soft delete**: nessuna cancellazione fisica (§5.1).
 *    `softDelete` imposta `deleted_at`; `restore` lo annulla.
 *  - **Ogni scrittura** va in `BEGIN IMMEDIATE … COMMIT`.
 *  - **Update con body cambiato** appende la versione precedente in `dream_revision`
 *    (nessuna perdita di body storico).
 *  - Mappatura snake_case (DB) ↔ camelCase (dominio) isolata qui.
 *  - Privacy (§8.5.4): nessun log di body/title. Gli errori includono solo id.
 *
 * `search`: su SQLite reale usa FTS5 `MATCH`; sullo stub InMemoryDB ricade su
 * `LIKE` su title+body (lo stub non implementa FTS5).
 */
import type { Dream, Emotion, Lucidity } from '@lucidme/core';
import type { DB } from '../client.js';

interface DreamRow {
  id: string;
  created_at: string;
  dreamed_on: string;
  title: string;
  body: string;
  emotion: string;
  lucidity: number;
  seed: string;
  deleted_at: string | null;
}

interface RevisionRow {
  body: string;
  saved_at: string;
}

/** Snake → camel. */
function rowToDream(r: DreamRow): Dream {
  return {
    id: r.id,
    createdAt: r.created_at,
    dreamedOn: r.dreamed_on,
    title: r.title,
    body: r.body,
    emotion: r.emotion as Emotion,
    lucidity: r.lucidity as Lucidity,
    seed: r.seed,
    deletedAt: r.deleted_at,
  };
}

export interface ListOptions {
  /** Default false: i soft-deleted sono esclusi da listAll. */
  includeDeleted?: boolean;
}

export class DreamRepo {
  constructor(private readonly db: DB) {}

  /**
   * Inserisce un nuovo sogno. Append-only. Transazione singola.
   * Se l'id esiste già (conflict) → nessun inserimento (INSERT OR IGNORE).
   */
  async insert(d: Dream): Promise<void> {
    await this.db.exec('BEGIN IMMEDIATE');
    try {
      await this.db.exec(
        `INSERT OR IGNORE INTO dream
          (id, created_at, dreamed_on, title, body, emotion, lucidity, seed, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          d.id,
          d.createdAt,
          d.dreamedOn,
          d.title,
          d.body,
          d.emotion,
          d.lucidity,
          d.seed,
          d.deletedAt,
        ],
      );
      await this.db.exec('COMMIT');
    } catch (err) {
      await safeRollback(this.db);
      throw err;
    }
  }

  /**
   * Aggiorna un sogno esistente. Se il `body` differisce da quello salvato,
   * appende il body precedente in `dream_revision` (storico immutabile).
   * Il `seed` NON viene mai modificato (immutabile §8.3).
   */
  async update(d: Dream): Promise<void> {
    await this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = await this.db.query<DreamRow>(
        'SELECT body FROM dream WHERE id = ?',
        [d.id],
      );
      const prev = existing[0]?.body;
      if (prev !== undefined && prev !== d.body) {
        await this.db.exec(
          `INSERT INTO dream_revision (dream_id, body, saved_at) VALUES (?, ?, ?)`,
          [d.id, prev, new Date().toISOString()],
        );
      }
      await this.db.exec(
        `UPDATE dream
           SET created_at = ?, dreamed_on = ?, title = ?, body = ?,
               emotion = ?, lucidity = ?, deleted_at = ?
         WHERE id = ?`,
        [
          d.createdAt,
          d.dreamedOn,
          d.title,
          d.body,
          d.emotion,
          d.lucidity,
          d.deletedAt,
          d.id,
        ],
      );
      await this.db.exec('COMMIT');
    } catch (err) {
      await safeRollback(this.db);
      throw err;
    }
  }

  /** Soft-delete: imposta `deleted_at`. Nessuna cancellazione fisica. */
  async softDelete(id: string): Promise<void> {
    await this.db.exec('BEGIN IMMEDIATE');
    try {
      await this.db.exec(
        'UPDATE dream SET deleted_at = ? WHERE id = ?',
        [new Date().toISOString(), id],
      );
      await this.db.exec('COMMIT');
    } catch (err) {
      await safeRollback(this.db);
      throw err;
    }
  }

  /** Annulla il soft-delete. */
  async restore(id: string): Promise<void> {
    await this.db.exec('BEGIN IMMEDIATE');
    try {
      await this.db.exec(
        'UPDATE dream SET deleted_at = NULL WHERE id = ?',
        [id],
      );
      await this.db.exec('COMMIT');
    } catch (err) {
      await safeRollback(this.db);
      throw err;
    }
  }

  /** Restituisce un sogno per id (anche se soft-deleted), o null. */
  async getById(id: string): Promise<Dream | null> {
    const rows = await this.db.query<DreamRow>(
      'SELECT id, created_at, dreamed_on, title, body, emotion, lucidity, seed, deleted_at FROM dream WHERE id = ?',
      [id],
    );
    const r = rows[0];
    return r ? rowToDream(r) : null;
  }

  /**
   * Tutti i sogni, ordinati per `dreamed_on DESC`. Di default esclude i
   * soft-deleted; passa `{ includeDeleted: true }` per includerli.
   */
  async listAll(opts: ListOptions = {}): Promise<Dream[]> {
    const sql = opts.includeDeleted
      ? 'SELECT id, created_at, dreamed_on, title, body, emotion, lucidity, seed, deleted_at FROM dream ORDER BY dreamed_on DESC'
      : 'SELECT id, created_at, dreamed_on, title, body, emotion, lucidity, seed, deleted_at FROM dream WHERE deleted_at IS NULL ORDER BY dreamed_on DESC';
    const rows = await this.db.query<DreamRow>(sql);
    return rows.map(rowToDream);
  }

  /**
   * Ricerca full-text. Su SQLite reale: FTS5 `MATCH`. Sullo stub InMemoryDB:
   * `LIKE` su title e body (case-insensitive). Entrambi i path escludono i
   * soft-deleted e ordinano per dreamed_on DESC.
   */
  async search(q: string): Promise<Dream[]> {
    const term = q.trim();
    if (term === '') return [];
    // Prova prima FTS5 (reale). Se il backend non lo supporta (stub), ricade
    // su LIKE. Rileviamo via try/catch sul MATCH.
    try {
      const rows = await this.db.query<DreamRow>(
        `SELECT d.id, d.created_at, d.dreamed_on, d.title, d.body, d.emotion, d.lucidity, d.seed, d.deleted_at
           FROM dream d
          WHERE d.rowid IN (SELECT rowid FROM dream_fts WHERE dream_fts MATCH ?)
            AND d.deleted_at IS NULL
          ORDER BY d.dreamed_on DESC`,
        [term],
      );
      return rows.map(rowToDream);
    } catch {
      // fallback LIKE (stub InMemoryDB / FTS5 non disponibile)
      const like = `%${term}%`;
      const rows = await this.db.query<DreamRow>(
        `SELECT id, created_at, dreamed_on, title, body, emotion, lucidity, seed, deleted_at
           FROM dream
          WHERE (title LIKE ? OR body LIKE ?) AND deleted_at IS NULL
          ORDER BY dreamed_on DESC`,
        [like, like],
      );
      return rows.map(rowToDream);
    }
  }

  /** Storico dei body precedenti (dream_revision), dal più recente. */
  async getRevisions(id: string): Promise<{ body: string; savedAt: string }[]> {
    const rows = await this.db.query<RevisionRow>(
      'SELECT body, saved_at FROM dream_revision WHERE dream_id = ? ORDER BY saved_at DESC',
      [id],
    );
    return rows.map((r) => ({ body: r.body, savedAt: r.saved_at }));
  }
}

/** Rollback best-effort. */
async function safeRollback(db: DB): Promise<void> {
  try {
    await db.exec('ROLLBACK');
  } catch {
    /* no-op */
  }
}
