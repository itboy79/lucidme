/**
 * `RCRepo` — reality check events (§S5-3, §8.3).
 *
 * Ogni riga è una notifica di reality check "sparata" durante il giorno.
 * `acknowledged` è tri-state: NULL = pending, 1 = "stavo sognando",
 * 0 = "ero sveglio".
 *
 * Dati consumati da Lume (Step 6):
 *  - `responseRate(from, to)`: % di eventi con acknowledged NOT NULL;
 *  - "check in sogno": eventi con acknowledged = 1 (segnale precoce di lucidità).
 *
 * Privacy (§8.5.4): nessun contenuto di sogno; solo metadati temporali + risposta.
 */
import { LOCAL_USER_ID } from './path-repo.js';
import { hashStr } from '@lucidme/core';
import type { DB } from '../client.js';

/** Tri-state di acknowledgment: null = pending. */
export type Acknowledged = 0 | 1 | null;

/** Un evento di reality check sparato. */
export interface RealityCheckEvent {
  id: string;
  userId: string;
  /** ISO timestamp del fire. */
  firedAt: string;
  /** null=pending, true=was-dreaming, false=was-awake. */
  acknowledged: boolean | null;
  /** Id del prompt mostrato, o null. */
  promptId: string | null;
}

interface RCRow {
  id: string;
  user_id: string;
  fired_at: string;
  acknowledged: number | null;
  prompt_id: string | null;
}

function rowToEvent(r: RCRow): RealityCheckEvent {
  return {
    id: r.id,
    userId: r.user_id,
    firedAt: r.fired_at,
    acknowledged:
      r.acknowledged == null ? null : r.acknowledged === 1,
    promptId: r.prompt_id,
  };
}

export class RCRepo {
  constructor(private readonly db: DB) {}

  /**
   * Registra un fire (acknowledged=null). L'id è deterministico da
   * `firedAt + promptId + random` via hashStr, così non serve UUID esterno.
   * Se l'evento per quel firedAt esiste già, è no-op (idempotente: un retry di
   * scheduling non duplica eventi).
   */
  async log(firedAt: string, promptId: string | null): Promise<void> {
    const id = `rc_${hashStr(`${firedAt}|${promptId ?? ''}|${Math.random()}`).toString(16)}`;
    await this.db.exec('BEGIN IMMEDIATE');
    try {
      await this.db.exec(
        `INSERT OR IGNORE INTO reality_check_event
           (id, user_id, fired_at, acknowledged, prompt_id)
         VALUES (?, ?, ?, ?, ?)`,
        [id, LOCAL_USER_ID, firedAt, null, promptId],
      );
      await this.db.exec('COMMIT');
    } catch (err) {
      await safeRollback(this.db);
      throw err;
    }
  }

  /**
   * Registra la risposta a un evento (dalle azioni di notifica o dall'overlay).
   * `wasDreaming=true` → acknowledged=1; `false` → 0. Idempotente.
   */
  async acknowledge(id: string, wasDreaming: boolean): Promise<void> {
    await this.db.exec('BEGIN IMMEDIATE');
    try {
      await this.db.exec(
        `UPDATE reality_check_event SET acknowledged = ? WHERE id = ?`,
        [wasDreaming ? 1 : 0, id],
      );
      await this.db.exec('COMMIT');
    } catch (err) {
      await safeRollback(this.db);
      throw err;
    }
  }

  /** Eventi in [from, to] (ISO timestamps), ordinati per fired_at ASC. */
  async listRange(from: string, to: string): Promise<RealityCheckEvent[]> {
    const rows = await this.db.query<RCRow>(
      `SELECT id, user_id, fired_at, acknowledged, prompt_id
         FROM reality_check_event
        WHERE user_id = ? AND fired_at >= ? AND fired_at <= ?
        ORDER BY fired_at ASC`,
      [LOCAL_USER_ID, from, to],
    );
    return rows.map(rowToEvent);
  }

  /** Un evento per id, o null. */
  async get(id: string): Promise<RealityCheckEvent | null> {
    const rows = await this.db.query<RCRow>(
      `SELECT id, user_id, fired_at, acknowledged, prompt_id
         FROM reality_check_event
        WHERE user_id = ? AND id = ?`,
      [LOCAL_USER_ID, id],
    );
    const r = rows[0];
    return r ? rowToEvent(r) : null;
  }

  /**
   * Tasso di risposta in [from, to]: frazione di eventi con `acknowledged` NOT
   * NULL. Ritorna 0 se non ci sono eventi nel range.
   */
  async responseRate(from: string, to: string): Promise<number> {
    const events = await this.listRange(from, to);
    if (events.length === 0) return 0;
    const answered = events.filter((e) => e.acknowledged !== null).length;
    return answered / events.length;
  }

  /** Tutti gli eventi dell'utente (per debug / export), fired_at ASC. */
  async listAll(): Promise<RealityCheckEvent[]> {
    const rows = await this.db.query<RCRow>(
      `SELECT id, user_id, fired_at, acknowledged, prompt_id
         FROM reality_check_event
        WHERE user_id = ?
        ORDER BY fired_at ASC`,
      [LOCAL_USER_ID],
    );
    return rows.map(rowToEvent);
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
