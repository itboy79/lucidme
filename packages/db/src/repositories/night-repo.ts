/**
 * `NightRepo` — rituale serale (§S4-1, §8.3 NightRitual).
 *
 * Modello: una riga `night_ritual` per (user_id, date 'YYYY-MM-DD'). I tre flag
 * MILD/TLR/sign sono i "tre gesti" del rituale serale (intenzione MILD, training
 * TLR, ripasso dream sign). `wbtb_time` registra l'orario WBTB impostato.
 *
 * Regola chiave: a mezzanotte (nuova data) il rituale resetta — una NUOVA riga
 * per la nuova data. `getToday()` usa la data locale del device.
 *
 * Privacy (§8.5.4): nessun contenuto di sogno qui, solo flag booleani e orari.
 */
import { LOCAL_USER_ID } from './path-repo.js';
import type { DB } from '../client.js';

/**
 * Stato del rituale per una singola data.
 * I flag `mildDone`/`tlrDone`/`signsDone` sono i tre gesti (tap = toggle).
 */
export interface NightRitual {
  /** Sempre 'local' fino allo Step 7. */
  userId: string;
  /** Data 'YYYY-MM-DD' (timezone device). */
  date: string;
  /** Gesto 1: intenzione MILD. */
  mildDone: boolean;
  /** Gesto 2: training TLR (≥15 min completati). */
  tlrDone: boolean;
  /** Gesto 3: ripasso dream sign. */
  signsDone: boolean;
  /** Orario WBTB impostato per la notte (HH:MM) o null. */
  wbtbTime: string | null;
}

interface NightRow {
  user_id: string;
  date: string;
  mild_done: number;
  tlr_done: number;
  signs_done: number;
  wbtb_time: string | null;
}

/** La giornata solare corrente (timezone device) come YYYY-MM-DD. */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rowToRitual(r: NightRow): NightRitual {
  return {
    userId: r.user_id,
    date: r.date,
    mildDone: r.mild_done === 1,
    tlrDone: r.tlr_done === 1,
    signsDone: r.signs_done === 1,
    wbtbTime: r.wbtb_time,
  };
}

/**
 * Set parziale per `upsert`: i flag sono opzionali (altrimenti default false);
 * `date` defaulta a oggi. Usato per toggle + write-only (es. `setWbtbTime`).
 */
export interface NightRitualUpdate {
  date?: string;
  mildDone?: boolean;
  tlrDone?: boolean;
  signsDone?: boolean;
  wbtbTime?: string | null;
}

export class NightRepo {
  constructor(private readonly db: DB) {}

  /** Il rituale di oggi (data device), o null se non ancora iniziato. */
  async getToday(date: string = todayKey()): Promise<NightRitual | null> {
    const rows = await this.db.query<NightRow>(
      `SELECT user_id, date, mild_done, tlr_done, signs_done, wbtb_time
         FROM night_ritual
        WHERE user_id = ? AND date = ?`,
      [LOCAL_USER_ID, date],
    );
    const r = rows[0];
    return r ? rowToRitual(r) : null;
  }

  /**
   * Upsert: scrive i campi forniti, mantenendo gli altri al loro valore
   * attente (o default false per i flag se la riga è nuova). Ritorna lo stato
   * completo dopo la scrittura.
   *
   * Implementazione read-merge-write: leggiamo la riga corrente (se esiste),
   * applichiamo i campi del partial, poi INSERT ... ON CONFLICT DO UPDATE.
   * Tutto in transazione per evitare race tra toggle concorrenti.
   */
  async upsert(partial: NightRitualUpdate): Promise<NightRitual> {
    const date = partial.date ?? todayKey();
    const current = await this.getToday(date);
    const merged: NightRitual = {
      userId: LOCAL_USER_ID,
      date,
      mildDone: partial.mildDone ?? current?.mildDone ?? false,
      tlrDone: partial.tlrDone ?? current?.tlrDone ?? false,
      signsDone: partial.signsDone ?? current?.signsDone ?? false,
      wbtbTime:
        partial.wbtbTime !== undefined
          ? partial.wbtbTime
          : (current?.wbtbTime ?? null),
    };
    await this.db.exec('BEGIN IMMEDIATE');
    try {
      await this.db.exec(
        `INSERT INTO night_ritual (user_id, date, mild_done, tlr_done, signs_done, wbtb_time)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, date) DO UPDATE SET
           mild_done = excluded.mild_done,
           tlr_done = excluded.tlr_done,
           signs_done = excluded.signs_done,
           wbtb_time = excluded.wbtb_time`,
        [
          LOCAL_USER_ID,
          date,
          merged.mildDone ? 1 : 0,
          merged.tlrDone ? 1 : 0,
          merged.signsDone ? 1 : 0,
          merged.wbtbTime,
        ],
      );
      await this.db.exec('COMMIT');
    } catch (err) {
      await safeRollback(this.db);
      throw err;
    }
    return merged;
  }

  /** Toggle del gesto MILD. Ritorna il nuovo stato completo. */
  async toggleMild(date?: string): Promise<NightRitual> {
    const current = await this.getToday(date);
    return this.upsert({ date, mildDone: !(current?.mildDone ?? false) });
  }

  /** Toggle del gesto TLR. */
  async toggleTlr(date?: string): Promise<NightRitual> {
    const current = await this.getToday(date);
    return this.upsert({ date, tlrDone: !(current?.tlrDone ?? false) });
  }

  /** Toggle del gesto "ripassa sign". */
  async toggleSigns(date?: string): Promise<NightRitual> {
    const current = await this.getToday(date);
    return this.upsert({ date, signsDone: !(current?.signsDone ?? false) });
  }

  /** Imposta/aggiorna solo l'orario WBTB per la data corrente. */
  async setWbtbTime(time: string | null, date?: string): Promise<NightRitual> {
    return this.upsert({ date, wbtbTime: time });
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
