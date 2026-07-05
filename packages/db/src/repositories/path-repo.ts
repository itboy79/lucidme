/**
 * `PathRepo` — repository per il progresso del Sentiero (§S3-3, §8.3).
 *
 * Modello: una riga `path_progress` per ogni (user_id, day) completato.
 *
 * Regola chiave (§S3-3): **una sola lezione completabile per giorno solare**,
 * in timezone device. Completare il giorno 8 l'8 luglio sblocca il giorno 9
 * il 9 luglio. Nessun recupero multiplo in v1.
 *
 * `getCurrentDay()`: il prossimo giorno da fare (1 se non hai iniziato,
 * altrimenti l'ultimo completato + 1, capped a 21).
 *
 * `canCompleteDay(n)`: true se `n === getCurrentDay()` AND non hai già
 * completato nulla "oggi" (timezone device). L'updatedAt di riferimento è
 * `completed_at` dell'ultima riga, confrontato con la data corrente locale.
 *
 * `markComplete(n, technique?)`: scrive la riga. Lancia se `canCompleteDay(n)`
 * è false (regola bloccante). Idempotente solo entro retry meccanico (stesso
 * giorno, stessa chiamata): il PRIMARY KEY impedisce duplicati dello stesso
 * giorno; il check temporale impedisce più giorni nello stesso giorno solare.
 *
 * Privacy (§8.5.4): nessun contenuto di lezione qui, solo metadati temporali.
 */
import type { DB } from '../client.js';

/** Tecnica associata al completamento (per analytics, §8.3 enum). */
export type PathTechnique = 'recall' | 'RT' | 'MILD' | 'WBTB' | 'SSILD' | 'TLR';

/** Riga di progresso del Sentiero. */
export interface PathProgress {
  /** Sempre 'local' fino allo Step 7. */
  userId: string;
  /** Giorno completato (1..21). */
  day: number;
  /** ISO timestamp del completamento. */
  completedAt: string;
  /** Tecnica esercitata (opzionale, per analytics). */
  technique: PathTechnique | null;
}

/** Il giorno massimo del percorso (costante dominio). */
export const PATH_MAX_DAY = 21;
/** user_id fisso fino agli account (Step 7). */
export const LOCAL_USER_ID = 'local';

interface PathRow {
  user_id: string;
  day: number;
  completed_at: string;
  technique: string | null;
}

function rowToProgress(r: PathRow): PathProgress {
  return {
    userId: r.user_id,
    day: r.day,
    completedAt: r.completed_at,
    technique: r.technique as PathTechnique | null,
  };
}

/**
 * Estrae la "giornata solare" (YYYY-MM-DD) in timezone device da un ISO
 * timestamp. Usata per confrontare se due completamenti cadono nello stesso
 * giorno solare. Se l'ISO non si parse, ricade sul prefisso ( primi 10 char ).
 */
function localDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** La giornata solare corrente (timezone device) come YYYY-MM-DD. */
function todayKey(): string {
  return localDayKey(new Date().toISOString());
}

export class PathRepo {
  constructor(private readonly db: DB) {}

  /** Tutti i completamenti dell'utente locale, ordinati per giorno. */
  async getProgress(): Promise<PathProgress[]> {
    const rows = await this.db.query<PathRow>(
      `SELECT user_id, day, completed_at, technique
         FROM path_progress
        WHERE user_id = ?
        ORDER BY day ASC`,
      [LOCAL_USER_ID],
    );
    return rows.map(rowToProgress);
  }

  /**
   * Il prossimo giorno da completare. Regole:
   *  - se non c'è nulla → 1 (primo accesso);
   *  - altrimenti (max day completato) + 1;
   *  - capped a PATH_MAX_DAY (21): completato tutto → ritorna 21.
   */
  async getCurrentDay(): Promise<number> {
    const rows = await this.db.query<PathRow>(
      `SELECT user_id, day, completed_at, technique
         FROM path_progress
        WHERE user_id = ?`,
      [LOCAL_USER_ID],
    );
    if (rows.length === 0) return 1;
    const max = rows.reduce((m, r) => Math.max(m, r.day), 0);
    return Math.min(max + 1, PATH_MAX_DAY);
  }

  /**
   * True se l'utente può completare il giorno `day` adesso. Regola §S3-3:
   *  - `day` deve essere il giorno corrente (getCurrentDay);
   *  - non deve esistere già un completamento "oggi" (timezone device).
   *
   * Quest'ultimo vincolo è il "un giorno per giorno solare".
   */
  async canCompleteDay(day: number): Promise<boolean> {
    const current = await this.getCurrentDay();
    if (day !== current) return false;
    // già completato oggi? Calcoliamo in JS (lo stub non aggrega MAX/COUNT).
    const today = todayKey();
    const rows = await this.db.query<{ completed_at: string }>(
      `SELECT completed_at FROM path_progress WHERE user_id = ?`,
      [LOCAL_USER_ID],
    );
    if (rows.length === 0) return true; // mai completato nulla → libero
    // ultimo completamento per data
    const last = rows
      .map((r) => r.completed_at)
      .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))[0];
    if (last === undefined) return true;
    return localDayKey(last) !== today;
  }

  /**
   * Registra il completamento del giorno `day`. Lancia se `canCompleteDay(day)`
   * è false (regola bloccante: un solo giorno per giorno solare).
   * Usa INSERT OR IGNORE: un retry meccanico dello stesso giorno nello stesso
   * momento è no-op (il PRIMARY KEY scarta il duplicato); ma il check preventivo
   * copre il caso "giorno diverso, stesso giorno solare".
   */
  async markComplete(day: number, technique?: PathTechnique): Promise<void> {
    const ok = await this.canCompleteDay(day);
    if (!ok) {
      throw new Error(
        `markComplete(${day}): giorno non completabile ora (regola un-giorno-per-giorno-solare o fuori sequenza)`,
      );
    }
    await this.db.exec('BEGIN IMMEDIATE');
    try {
      await this.db.exec(
        `INSERT OR IGNORE INTO path_progress (user_id, day, completed_at, technique)
         VALUES (?, ?, ?, ?)`,
        [LOCAL_USER_ID, day, new Date().toISOString(), technique ?? null],
      );
      await this.db.exec('COMMIT');
    } catch (err) {
      await safeRollback(this.db);
      throw err;
    }
  }

  /** Numero di giorni completati (utile per la % di progresso). */
  async getCompletedCount(): Promise<number> {
    const rows = await this.db.query<{ day: number }>(
      `SELECT day FROM path_progress WHERE user_id = ?`,
      [LOCAL_USER_ID],
    );
    return rows.length;
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
