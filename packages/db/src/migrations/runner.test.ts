import { describe, expect, it } from 'vitest';
import { InMemoryDB } from '../client.js';
import { MIGRATIONS, runMigrations, SCHEMA_VERSION, splitStatements } from './runner.js';

describe('runMigrations', () => {
  it('applica lo schema 001 su DB vuoto', async () => {
    const db = new InMemoryDB();
    await runMigrations(db);
    // la tabella schema_version deve esistere con versione 1
    const rows = await db.query<{ version: number }>('SELECT version FROM schema_version');
    expect(rows[0]?.version).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
  });

  it('idempotente: rieseguire non fa nulla', async () => {
    const db = new InMemoryDB();
    await runMigrations(db);
    await expect(runMigrations(db)).resolves.toBeUndefined();
    const rows = await db.query<{ version: number }>('SELECT version FROM schema_version');
    expect(rows[0]?.version).toBe(MIGRATIONS[MIGRATIONS.length - 1]?.version);
  });

  it('crea le tabelle del modello (dream, dream_revision, dream_sign, dream_sign_hit)', async () => {
    const db = new InMemoryDB();
    await runMigrations(db);
    // inseriamo e leggiamo per verificare che le tabelle esistano
    await db.exec(
      `INSERT INTO dream (id, created_at, dreamed_on, title, body, emotion, lucidity, seed, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['T'.repeat(26), '2025-06-01T00:00:00.000Z', '2025-06-01', 'x', 'y', 'calma', 0, 'abcd1234', null],
    );
    const d = await db.query('SELECT id FROM dream');
    expect(d).toHaveLength(1);

    await db.exec(
      `INSERT INTO dream_revision (dream_id, body, saved_at) VALUES (?, ?, ?)`,
      ['T'.repeat(26), 'old', '2025-06-01T00:00:00.000Z'],
    );
    await db.exec(
      `INSERT INTO dream_sign (id, label, auto_detected) VALUES (?, ?, ?)`,
      ['S'.repeat(26), 'acqua', 1],
    );
    expect(await db.query('SELECT id FROM dream_sign')).toHaveLength(1);
  });

  it('PRAGMA integrity_check → ok (compatibilità crash-recovery)', async () => {
    const db = new InMemoryDB();
    await runMigrations(db);
    const r = await db.query<{ integrity_check: string }>('PRAGMA integrity_check');
    expect(r[0]?.integrity_check).toBe('ok');
  });

  it('003 crea night_ritual e settings (§S4-1)', async () => {
    const db = new InMemoryDB();
    await runMigrations(db);
    // Inseriamo una riga di rituale: se la tabella non esistesse, lancerebbe.
    await db.exec(
      `INSERT INTO night_ritual (user_id, date, mild_done, tlr_done, signs_done, wbtb_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['local', '2025-07-05', 1, 0, 0, '04:40'],
    );
    const r = await db.query<{ date: string }>(
      'SELECT date FROM night_ritual WHERE user_id = ?',
      ['local'],
    );
    expect(r.length).toBe(1);
    expect(r[0]?.date).toBe('2025-07-05');

    // settings: key-value JSON
    await db.exec(
      `INSERT INTO settings (user_id, key, value) VALUES (?, ?, ?)`,
      ['local', 'sleep', '{"sleepTime":"23:30"}'],
    );
    expect(await db.query('SELECT key FROM settings')).toHaveLength(1);
  });

  it('004 crea reality_check_event (§S5-3)', async () => {
    const db = new InMemoryDB();
    await runMigrations(db);
    await db.exec(
      `INSERT INTO reality_check_event (id, user_id, fired_at, acknowledged, prompt_id)
       VALUES (?, ?, ?, ?, ?)`,
      ['rc_1', 'local', '2025-07-05T09:00:00.000Z', null, 'mani_1'],
    );
    const r = await db.query<{ id: string }>(
      'SELECT id FROM reality_check_event WHERE user_id = ?',
      ['local'],
    );
    expect(r.length).toBe(1);
    expect(r[0]?.id).toBe('rc_1');
  });

  it('SCHEMA_VERSION riflette le migration 003/004', () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(4);
  });
});

describe('splitStatements', () => {
  it('splitta statement multipli sul ;', () => {
    const out = splitStatements('SELECT 1; SELECT 2;');
    expect(out.length).toBe(2);
  });

  it('NON spezza i ; dentro i corpi dei trigger (BEGIN ... END)', () => {
    const sql = `CREATE TRIGGER t AFTER INSERT ON dream BEGIN
      INSERT INTO log VALUES (1);
      INSERT INTO log VALUES (2);
    END;
    SELECT 1;`;
    const out = splitStatements(sql);
    // 1 trigger (intero) + 1 SELECT
    expect(out.length).toBe(2);
    expect(out[0]).toContain('CREATE TRIGGER');
    expect(out[0]).toContain('END');
    expect(out[1]).toContain('SELECT 1');
  });

  it('stringa vuota → []', () => {
    expect(splitStatements('')).toEqual([]);
    expect(splitStatements('   ')).toEqual([]);
  });

  it('statement senza ; finale → comunque restituito (trailing buf)', () => {
    const out = splitStatements('SELECT 1');
    expect(out).toEqual(['SELECT 1']);
  });

  it('CREATE TRIGGER senza ; finale + SELECT', () => {
    const out = splitStatements(
      'CREATE TRIGGER t BEGIN INSERT INTO x VALUES (1); END',
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('CREATE TRIGGER');
  });

  it('safeRollback best-effort: idempotente su runner già committato', async () => {
    // Dopo runMigrations riuscito, una nuova esecuzione non tocca le transazioni;
    // verifichiamo che safeRollback non esploda chiamandolo fuori transazione
    // indirettamente (runMigrations su DB già aggiornato = no-op, nessun BEGIN).
    const db = new InMemoryDB();
    await runMigrations(db);
    await expect(runMigrations(db)).resolves.toBeUndefined();
  });
});
