/**
 * `SignRepo` — repository per `DreamSign` (§S2-2).
 * v1: gestione minima dei sign (per la tabella `dream_sign`). Le hit
 * (`dream_sign_hit`) e l'integrazione con `detectSigns` vivono in S2-6.
 */
import type { DreamSign } from '@lucidme/core';
import type { DB } from '../client.js';

interface SignRow {
  id: string;
  label: string;
  auto_detected: number;
}

function rowToSign(r: SignRow): DreamSign {
  return {
    id: r.id,
    label: r.label,
    autoDetected: r.auto_detected === 1,
  };
}

export class SignRepo {
  constructor(private readonly db: DB) {}

  /** Insert-or-replace su id. Label sempre normalizzata dal chiamante. */
  async upsert(sign: DreamSign): Promise<void> {
    await this.db.exec('BEGIN IMMEDIATE');
    try {
      await this.db.exec(
        `INSERT INTO dream_sign (id, label, auto_detected) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET label = excluded.label, auto_detected = excluded.auto_detected`,
        [sign.id, sign.label, sign.autoDetected ? 1 : 0],
      );
      await this.db.exec('COMMIT');
    } catch (err) {
      await safeRollback(this.db);
      throw err;
    }
  }

  /** Tutti i sign, per label ASC. */
  async list(): Promise<DreamSign[]> {
    const rows = await this.db.query<SignRow>(
      'SELECT id, label, auto_detected FROM dream_sign ORDER BY label ASC',
    );
    return rows.map(rowToSign);
  }

  /** Elimina un sign per id (i sign NON hanno l'invariante append-only dei sogni). */
  async delete(id: string): Promise<void> {
    await this.db.exec('BEGIN IMMEDIATE');
    try {
      await this.db.exec('DELETE FROM dream_sign WHERE id = ?', [id]);
      await this.db.exec('COMMIT');
    } catch (err) {
      await safeRollback(this.db);
      throw err;
    }
  }
}

async function safeRollback(db: DB): Promise<void> {
  try {
    await db.exec('ROLLBACK');
  } catch {
    /* no-op */
  }
}
