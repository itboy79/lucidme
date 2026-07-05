/**
 * `SettingsRepo` — impostazioni key-value generiche (§S4-2).
 *
 * Tabella `settings` (user_id, key, value): i valori sono serializzati come
 * JSON (`JSON.stringify`) così supportiamo stringhe, numeri, booleani, oggetti.
 *
 * In v1 ospita le impostazioni sonno (ora-sonno, ora-sveglia, WBTB on/off,
 * orario WBTB, suoneria) e il cursore del prompt pool dei reality check (§S5-2).
 *
 * Privacy (§8.5.4): nessun contenuto di sogno — solo preferenze utente.
 */
import { LOCAL_USER_ID } from './path-repo.js';
import type { DB } from '../client.js';

interface SettingRow {
  key: string;
  value: string;
}

export class SettingsRepo {
  constructor(private readonly db: DB) {}

  /**
   * Legge il valore per `key`, deserializzato da JSON. Ritorna `null` se la
   * chiave non esiste. Il tipo `T` è responsabilità del chiamante (nessuna
   * validazione di schema qui — v1 tipizza via TS).
   */
  async get<T>(key: string): Promise<T | null> {
    const rows = await this.db.query<SettingRow>(
      'SELECT key, value FROM settings WHERE user_id = ? AND key = ?',
      [LOCAL_USER_ID, key],
    );
    const r = rows[0];
    if (!r) return null;
    try {
      return JSON.parse(r.value) as T;
    } catch {
      // valore non-JSON (legacy/corrotto): restituiamo null piuttosto di lanciare
      return null;
    }
  }

  /** Scrive `value` serializzato in JSON. Upsert su (user_id, key). */
  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.db.exec('BEGIN IMMEDIATE');
    try {
      await this.db.exec(
        `INSERT INTO settings (user_id, key, value) VALUES (?, ?, ?)
         ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value`,
        [LOCAL_USER_ID, key, serialized],
      );
      await this.db.exec('COMMIT');
    } catch (err) {
      await safeRollback(this.db);
      throw err;
    }
  }

  /** Tutte le impostazioni come mappa `key → value` (deserializzata). */
  async getAll(): Promise<Record<string, unknown>> {
    const rows = await this.db.query<SettingRow>(
      'SELECT key, value FROM settings WHERE user_id = ?',
      [LOCAL_USER_ID],
    );
    const out: Record<string, unknown> = {};
    for (const r of rows) {
      try {
        out[r.key] = JSON.parse(r.value);
      } catch {
        // skip valori corrotti
      }
    }
    return out;
  }

  /** Rimuove una chiave (no-op se assente). */
  async remove(key: string): Promise<void> {
    await this.db.exec('BEGIN IMMEDIATE');
    try {
      await this.db.exec('DELETE FROM settings WHERE user_id = ? AND key = ?', [
        LOCAL_USER_ID,
        key,
      ]);
      await this.db.exec('COMMIT');
    } catch (err) {
      await safeRollback(this.db);
      throw err;
    }
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
