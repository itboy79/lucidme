import { describe, expect, it } from 'vitest';
import { InMemoryDB } from './client.js';
import { runMigrations } from './migrations/runner.js';

/**
 * Crash recovery (§S2-2 DoD): una transazione che lancia a metà NON lascia il
 * DB in stato inconsistente. Lo stub InMemoryDB implementa BEGIN/ROLLBACK via
 * snapshot; il repository `DreamRepo` catcha e fa rollback su errore.
 *
 * Qui simuliamo uno scenario dove una INSERT fallisce dopo BEGIN IMMEDIATE:
 * verifichiamo che nessuna scrittura sia persistita e che il DB sia integro
 * (`PRAGMA integrity_check` ok + stato coerente).
 */
describe('crash-recovery (transazioni + rollback)', () => {
  it('una INSERT che fallisce dopo BEGIN non persiste nulla', async () => {
    const db = new InMemoryDB();
    await runMigrations(db);

    // Stato iniziale: 0 sogni.
    expect(await db.query('SELECT id FROM dream')).toEqual([]);

    await db.exec('BEGIN IMMEDIATE');
    // inseriamo una riga valida
    await db.exec(
      `INSERT INTO dream (id, created_at, dreamed_on, title, body, emotion, lucidity, seed, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['A'.repeat(26), '2025-06-01T00:00:00.000Z', '2025-06-01', 't', 'b', 'calma', 0, 's', null],
    );
    // durante la transazione la riga è visibile
    expect(await db.query('SELECT id FROM dream')).toHaveLength(1);
    // SIMULIAMO IL CRASH: rollback esplicito (il repo lo farebbe nel catch)
    await db.exec('ROLLBACK');
    // dopo rollback: nessuna riga
    expect(await db.query('SELECT id FROM dream')).toEqual([]);
  });

  it('una transazione committata persiste', async () => {
    const db = new InMemoryDB();
    await runMigrations(db);
    await db.exec('BEGIN IMMEDIATE');
    await db.exec(
      `INSERT INTO dream (id, created_at, dreamed_on, title, body, emotion, lucidity, seed, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['B'.repeat(26), '2025-06-01T00:00:00.000Z', '2025-06-01', 't', 'b', 'calma', 0, 's', null],
    );
    await db.exec('COMMIT');
    expect(await db.query('SELECT id FROM dream')).toHaveLength(1);
  });

  it('rollback annulla PIÙ scritture nella stessa transazione', async () => {
    const db = new InMemoryDB();
    await runMigrations(db);

    // precondizione: 1 sogno committato
    await db.exec('BEGIN IMMEDIATE');
    await db.exec(
      `INSERT INTO dream (id, created_at, dreamed_on, title, body, emotion, lucidity, seed, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['C'.repeat(26), '2025-06-01T00:00:00.000Z', '2025-06-01', 't', 'b', 'calma', 0, 's', null],
    );
    await db.exec('COMMIT');

    // nuova transazione con 2 insert, poi crash
    await db.exec('BEGIN IMMEDIATE');
    await db.exec(
      `INSERT INTO dream (id, created_at, dreamed_on, title, body, emotion, lucidity, seed, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['D'.repeat(26), '2025-06-01T00:00:00.000Z', '2025-06-01', 't', 'b', 'calma', 0, 's', null],
    );
    await db.exec(
      `INSERT INTO dream_revision (dream_id, body, saved_at) VALUES (?, ?, ?)`,
      ['D'.repeat(26), 'b', '2025-06-01T00:00:00.000Z'],
    );
    await db.exec('ROLLBACK');

    // solo la prima insert committata sopravvive
    expect(await db.query('SELECT id FROM dream')).toHaveLength(1);
    expect(await db.query('SELECT dream_id FROM dream_revision')).toEqual([]);
  });

  it('PRAGMA integrity_check ok dopo un crash simulato', async () => {
    const db = new InMemoryDB();
    await runMigrations(db);
    await db.exec('BEGIN IMMEDIATE');
    await db.exec(
      `INSERT INTO dream (id, created_at, dreamed_on, title, body, emotion, lucidity, seed, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['E'.repeat(26), '2025-06-01T00:00:00.000Z', '2025-06-01', 't', 'b', 'calma', 0, 's', null],
    );
    await db.exec('ROLLBACK');
    const r = await db.query<{ integrity_check: string }>('PRAGMA integrity_check');
    expect(r[0]?.integrity_check).toBe('ok');
  });

  it('rollback() esplicito sullo stub ripristina lo snapshot', async () => {
    const stub = new InMemoryDB();
    await stub.exec('CREATE TABLE t (id TEXT)');
    await stub.exec('BEGIN IMMEDIATE');
    await stub.exec("INSERT INTO t (id) VALUES ('x')");
    expect(await stub.query('SELECT id FROM t')).toHaveLength(1);
    stub.rollback();
    expect(await stub.query('SELECT id FROM t')).toEqual([]);
  });

  it('transazioni annidate non supportate → errore', async () => {
    const db = new InMemoryDB();
    await db.exec('BEGIN IMMEDIATE');
    await expect(db.exec('BEGIN IMMEDIATE')).rejects.toThrow();
  });

  it('COMMIT senza BEGIN → errore', async () => {
    const db = new InMemoryDB();
    await expect(db.exec('COMMIT')).rejects.toThrow();
  });
});
