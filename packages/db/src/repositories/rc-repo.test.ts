/**
 * Test di `RCRepo` (§S5-3 DoD).
 *
 *  - log crea un evento pending (acknowledged=null);
 *  - acknowledge setta 1 (sognando) / 0 (sveglio);
 *  - listRange filtra per finestra temporale;
 *  - responseRate calcola la frazione risposte.
 */
import { describe, it, expect } from 'vitest';
import { makeTestDb } from '../test-harness.js';
import type { DB } from '../client.js';
import { RCRepo } from './rc-repo.js';

async function freshRepo(): Promise<{ db: DB; repo: RCRepo }> {
  const db = await makeTestDb();
  return { db, repo: new RCRepo(db) };
}

describe('RCRepo — §S5-3', () => {
  it('log crea evento pending', async () => {
    const { repo } = await freshRepo();
    await repo.log('2025-07-05T09:00:00.000Z', 'mani_1');
    const all = await repo.listRange('2025-07-05T00:00:00.000Z', '2025-07-05T23:59:59.000Z');
    expect(all.length).toBe(1);
    expect(all[0]?.acknowledged).toBeNull();
    expect(all[0]?.promptId).toBe('mani_1');
  });

  it('acknowledge true → was-dreaming', async () => {
    const { repo } = await freshRepo();
    await repo.log('2025-07-05T09:00:00.000Z', 'mani_1');
    const events = await repo.listRange('2025-07-05', '2025-07-06');
    const id = events[0]?.id;
    expect(id).toBeTruthy();
    if (!id) throw new Error('no id');
    await repo.acknowledge(id, true);
    const r = await repo.get(id);
    expect(r?.acknowledged).toBe(true);
  });

  it('acknowledge false → was-awake', async () => {
    const { repo } = await freshRepo();
    await repo.log('2025-07-05T09:00:00.000Z', 'testo_1');
    const [evt] = await repo.listRange('2025-07-05', '2025-07-06');
    expect(evt).toBeDefined();
    if (!evt) throw new Error('no event');
    await repo.acknowledge(evt.id, false);
    const r = await repo.get(evt.id);
    expect(r?.acknowledged).toBe(false);
  });

  it('listRange filtra per finestra temporale', async () => {
    const { repo } = await freshRepo();
    await repo.log('2025-07-05T09:00:00.000Z', 'a');
    await repo.log('2025-07-06T12:00:00.000Z', 'b');
    const day1 = await repo.listRange('2025-07-05T00:00:00.000Z', '2025-07-05T23:59:59.000Z');
    expect(day1.length).toBe(1);
    expect(day1[0]?.promptId).toBe('a');
    const both = await repo.listRange('2025-07-05', '2025-07-07');
    expect(both.length).toBe(2);
  });

  it('responseRate: 0 senza eventi, frazione corretta con risposte', async () => {
    const { repo } = await freshRepo();
    expect(await repo.responseRate('2025-07-05', '2025-07-07')).toBe(0);
    await repo.log('2025-07-05T09:00:00.000Z', 'a');
    await repo.log('2025-07-05T12:00:00.000Z', 'b');
    await repo.log('2025-07-05T15:00:00.000Z', 'c');
    const events = await repo.listRange('2025-07-05', '2025-07-06');
    const e0 = events[0];
    const e1 = events[1];
    if (!e0 || !e1) throw new Error('missing events');
    await repo.acknowledge(e0.id, true);
    await repo.acknowledge(e1.id, false);
    // 2 su 3 risposte
    expect(await repo.responseRate('2025-07-05', '2025-07-06')).toBeCloseTo(2 / 3, 5);
  });

  it('promptId null è ammesso', async () => {
    const { repo } = await freshRepo();
    await repo.log('2025-07-05T09:00:00.000Z', null);
    const [evt] = await repo.listRange('2025-07-05', '2025-07-06');
    expect(evt?.promptId).toBeNull();
  });

  it('sopravvive a kill: nuovo repo vede gli eventi', async () => {
    const { db, repo } = await freshRepo();
    await repo.log('2025-07-05T09:00:00.000Z', 'a');
    const repo2 = new RCRepo(db);
    const all = await repo2.listRange('2025-07-05', '2025-07-06');
    expect(all.length).toBe(1);
  });

  it('log su DB che lancia → rollback e rilancia', async () => {
    const throwing: DB = {
      async exec() {
        throw new Error('boom');
      },
      async query() {
        return [];
      },
    };
    const repo = new RCRepo(throwing);
    await expect(repo.log('2025-07-05T09:00:00.000Z', 'a')).rejects.toThrow('boom');
  });

  it('acknowledge su DB che lancia → rollback e rilancia', async () => {
    const throwing: DB = {
      async exec() {
        throw new Error('boom');
      },
      async query() {
        return [];
      },
    };
    const repo = new RCRepo(throwing);
    await expect(repo.acknowledge('x', true)).rejects.toThrow('boom');
  });

  it('listAll ritorna tutti gli eventi ordinati', async () => {
    const { repo } = await freshRepo();
    await repo.log('2025-07-06T12:00:00.000Z', 'b');
    await repo.log('2025-07-05T09:00:00.000Z', 'a');
    const all = await repo.listAll();
    expect(all.length).toBe(2);
    expect(all[0]?.firedAt).toBe('2025-07-05T09:00:00.000Z');
  });

  it('responseRate 0 quando nessun evento', async () => {
    const { repo } = await freshRepo();
    expect(await repo.responseRate('2025-07-05', '2025-07-07')).toBe(0);
  });

  it('get di id inesistente ritorna null', async () => {
    const { repo } = await freshRepo();
    expect(await repo.get('nope')).toBeNull();
  });
});
