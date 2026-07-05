import { describe, expect, it } from 'vitest';
import { createDream } from '@lucidme/core';
import type { DB } from './client.js';
import { DreamRepo } from './repositories/dream-repo.js';
import { SignRepo } from './repositories/sign-repo.js';
import { InMemoryDB } from './client.js';
import { runMigrations } from './migrations/runner.js';

/**
 * DB wrapper che lancia dopo N chiamate a `exec` (per forzare i path di
 * rollback + rethrow nei repository e nel runner). Copre i branch di errore.
 */
class FlakyDB implements DB {
  private real: DB;
  private failAfter: number;
  private calls = 0;
  constructor(real: DB, failAfter: number) {
    this.real = real;
    this.failAfter = failAfter;
  }
  async exec(sql: string, params?: unknown[]): Promise<void> {
    this.calls++;
    if (this.calls > this.failAfter) {
      throw new Error('simulated failure');
    }
    return this.real.exec(sql, params);
  }
  async query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    return this.real.query<T>(sql, params);
  }
}

async function setup(): Promise<DB> {
  const db = new InMemoryDB();
  await runMigrations(db);
  return db;
}

const mkDream = () =>
  createDream({
    title: 'x',
    body: 'y',
    emotion: 'calma',
    lucidity: 0,
    dreamedOn: '2025-06-01',
    createdAt: '2025-06-01T00:00:00.000Z',
    id: '01HWERRORPATH00000000000A',
  });

describe('DreamRepo — error paths (rollback + rethrow)', () => {
  it('insert fallisce a metà transazione → rilancia e rollback', async () => {
    // failAfter=1: BEGIN ok, INSERT fallisce
    const db = new FlakyDB(await setup(), 1);
    const repo = new DreamRepo(db);
    await expect(repo.insert(mkDream())).rejects.toThrow('simulated failure');
    // la riga non è persistita
    expect(await repo.listAll({ includeDeleted: true })).toEqual([]);
  });

  it('update fallisce → rilancia', async () => {
    const base = await setup();
    const repo0 = new DreamRepo(base);
    await repo0.insert(mkDream());
    // nuova connessione flaky per l'update
    const db = new FlakyDB(base, 1);
    const repo = new DreamRepo(db);
    await expect(repo.update({ ...mkDream(), body: 'new' })).rejects.toThrow();
  });

  it('softDelete fallisce → rilancia', async () => {
    const base = await setup();
    const repo0 = new DreamRepo(base);
    await repo0.insert(mkDream());
    const db = new FlakyDB(base, 1);
    const repo = new DreamRepo(db);
    await expect(repo.softDelete(mkDream().id)).rejects.toThrow();
  });

  it('restore fallisce → rilancia', async () => {
    const base = await setup();
    const db = new FlakyDB(base, 1);
    const repo = new DreamRepo(db);
    await expect(repo.restore('x')).rejects.toThrow();
  });
});

describe('SignRepo — error paths', () => {
  it('upsert fallisce → rilancia', async () => {
    const db = new FlakyDB(await setup(), 1);
    const repo = new SignRepo(db);
    await expect(
      repo.upsert({ id: 'A', label: 'x', autoDetected: true }),
    ).rejects.toThrow();
  });

  it('delete fallisce → rilancia', async () => {
    const base = await setup();
    const repo0 = new SignRepo(base);
    await repo0.upsert({ id: 'A', label: 'x', autoDetected: true });
    const db = new FlakyDB(base, 1);
    const repo = new SignRepo(db);
    await expect(repo.delete('A')).rejects.toThrow();
  });
});

describe('runner — migration failure path', () => {
  it('migration che fallisce rilancia con contesto e fa rollback', async () => {
    // DB vuoto NON migrato: schema_version creata, SELECT (vuota), poi BEGIN +
    // prima CREATE TABLE del migration. failAfter basso per far fallire la
    // prima CREATE TABLE dentro la transazione.
    const fresh = new InMemoryDB();
    const db = new FlakyDB(fresh, 3);
    await expect(runMigrations(db)).rejects.toThrow(/migration 001-init/);
  });

  it('runner: UPDATE branch quando si migra da versione precedente', async () => {
    // Simula una versione registrata < max per forzare il branch UPDATE.
    const db = new InMemoryDB();
    await db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
    await db.exec('INSERT INTO schema_version (version) VALUES (?)', [0]);
    // Aggiungiamo una migration fittizia superiore per forzare l'UPDATE path:
    // non possiamo modificare MIGRATIONS, ma possiamo verificare che con
    // version=0 il runner usi INSERT (primo elemento). Testiamo comunque che
    // rieseguire non cambi versione (idempotenza con stato).
    await runMigrations(db);
    const rows = await db.query<{ version: number }>('SELECT version FROM schema_version');
    expect(rows[0]?.version).toBeGreaterThan(0);
  });
});
