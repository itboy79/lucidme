/**
 * Test di `SettingsRepo` (§S4-2 DoD).
 *
 *  - get ritorna null per chiavi assenti;
 *  - set/get stringa, numero, booleano, oggetto;
 *  - getAll restituisce tutto;
 *  - upsert su chiave esistente sovrascrive;
 *  - remove cancella.
 */
import { describe, it, expect } from 'vitest';
import { makeTestDb } from '../test-harness.js';
import type { DB } from '../client.js';
import { SettingsRepo } from './settings-repo.js';

async function freshRepo(): Promise<SettingsRepo> {
  const db = await makeTestDb();
  return new SettingsRepo(db);
}

describe('SettingsRepo — §S4-2', () => {
  it('get ritorna null per chiave assente', async () => {
    const repo = await freshRepo();
    expect(await repo.get('missing')).toBeNull();
  });

  it('set/get round-trip stringa', async () => {
    const repo = await freshRepo();
    await repo.set('suoneria', 'marea');
    expect(await repo.get<string>('suoneria')).toBe('marea');
  });

  it('set/get round-trip numero e booleano', async () => {
    const repo = await freshRepo();
    await repo.set('n', 42);
    await repo.set('flag', true);
    expect(await repo.get<number>('n')).toBe(42);
    expect(await repo.get<boolean>('flag')).toBe(true);
  });

  it('set/get round-trip oggetto (sleep settings)', async () => {
    const repo = await freshRepo();
    const sleep = { sleepTime: '23:30', wakeTime: '07:00', wbtb: true, wbtbTime: '05:00', sound: 'marea' };
    await repo.set('sleep', sleep);
    const back = await repo.get<typeof sleep>('sleep');
    expect(back).toEqual(sleep);
  });

  it('upsert sovrascrive chiave esistente', async () => {
    const repo = await freshRepo();
    await repo.set('k', 'a');
    await repo.set('k', 'b');
    expect(await repo.get<string>('k')).toBe('b');
  });

  it('getAll restituisce tutte le chiavi', async () => {
    const repo = await freshRepo();
    await repo.set('a', 1);
    await repo.set('b', 'x');
    const all = await repo.getAll();
    expect(all.a).toBe(1);
    expect(all.b).toBe('x');
    expect(Object.keys(all).length).toBe(2);
  });

  it('remove cancella e diventa null', async () => {
    const repo = await freshRepo();
    await repo.set('temp', 'val');
    await repo.remove('temp');
    expect(await repo.get('temp')).toBeNull();
  });

  it('valore JSON corrotto → get ritorna null (no throw)', async () => {
    const repo = await freshRepo();
    // scriviamo un valore non-JSON direttamente
    const db = await makeTestDb();
    const repo2 = new SettingsRepo(db);
    await db.exec('INSERT INTO settings (user_id, key, value) VALUES (?, ?, ?)', [
      'local',
      'corrupt',
      'not-json{{{',
    ]);
    expect(await repo2.get('corrupt')).toBeNull();
    void repo; // evita unused
  });

  it('getAll salta i valori corrotti senza lanciare', async () => {
    const db = await makeTestDb();
    const repo = new SettingsRepo(db);
    await repo.set('ok', 1);
    await db.exec('INSERT INTO settings (user_id, key, value) VALUES (?, ?, ?)', [
      'local',
      'corrupt',
      'not-json{{{',
    ]);
    const all = await repo.getAll();
    expect(all.ok).toBe(1);
    expect('corrupt' in all).toBe(false);
  });

  it('remove cancella e diventa null', async () => {
    const repo = await freshRepo();
    await repo.set('temp', 'val');
    await repo.remove('temp');
    expect(await repo.get('temp')).toBeNull();
  });

  it('set su DB che lancia → rollback e rilancia', async () => {
    const throwing: DB = {
      async exec() {
        throw new Error('boom');
      },
      async query() {
        return [];
      },
    };
    const repo = new SettingsRepo(throwing);
    await expect(repo.set('k', 'v')).rejects.toThrow('boom');
  });

  it('remove su DB che lancia → rollback e rilancia', async () => {
    const throwing: DB = {
      async exec() {
        throw new Error('boom');
      },
      async query() {
        return [];
      },
    };
    const repo = new SettingsRepo(throwing);
    await expect(repo.remove('k')).rejects.toThrow('boom');
  });
});
