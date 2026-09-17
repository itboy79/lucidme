import { describe, expect, it } from 'vitest';
import type { Dream } from '@lucidme/core';
import { createDream } from '@lucidme/core';
import type { DB } from '../client.js';
import { DreamRepo } from './dream-repo.js';
import { makeTestDb } from '../test-harness.js';

function mkDream(overrides: Partial<Dream> = {}): Dream {
  return createDream({
    title: 'Spiaggia',
    body: 'Camminavo sulla spiaggia, l\'acqua era calma.',
    emotion: 'calma',
    lucidity: 1,
    dreamedOn: '2025-06-01',
    createdAt: '2025-06-01T08:00:00.000Z',
    id: '01HWDREAMTEST00000000000A',
    ...overrides,
  });
}

describe('DreamRepo', () => {
  it('insert → getById round trip (snake ↔ camel)', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const d = mkDream();
    await repo.insert(d);
    const got = await repo.getById(d.id);
    expect(got).not.toBeNull();
    expect(got).toEqual(d); // campi camelCase preservati, deletedAt null
  });

  it('round trip preserva noRecall (true e false, S8-2)', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const nr = mkDream({ id: 'Z'.repeat(26), body: '', noRecall: true, lucidity: 0 });
    const normal = mkDream({ id: 'Y'.repeat(26) });
    await repo.insert(nr);
    await repo.insert(normal);

    expect((await repo.getById(nr.id))?.noRecall).toBe(true);
    expect((await repo.getById(normal.id))?.noRecall).toBe(false);
    const all = await repo.listAll();
    expect(all.find((d) => d.id === nr.id)?.noRecall).toBe(true);
    expect(all.find((d) => d.id === normal.id)?.noRecall).toBe(false);
  });

  it('update persiste noRecall (0/1)', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const d = mkDream({ body: 'ricordato parzialmente' });
    await repo.insert(d);
    await repo.update({ ...d, noRecall: true });
    expect((await repo.getById(d.id))?.noRecall).toBe(true);
    await repo.update({ ...d, noRecall: true, body: '' });
    expect((await repo.getById(d.id))?.body).toBe('');
  });

  it('getById ritorna null se inesistente', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    expect(await repo.getById('nope')).toBeNull();
  });

  it('listAll ordina per dreamed_on DESC', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    await repo.insert(mkDream({ id: 'A'.repeat(26), dreamedOn: '2025-06-01' }));
    await repo.insert(mkDream({ id: 'B'.repeat(26), dreamedOn: '2025-06-10' }));
    await repo.insert(mkDream({ id: 'C'.repeat(26), dreamedOn: '2025-06-05' }));
    const all = await repo.listAll();
    expect(all.map((d) => d.dreamedOn)).toEqual([
      '2025-06-10',
      '2025-06-05',
      '2025-06-01',
    ]);
  });

  it('update con body cambiato appende una revisione', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const d = mkDream({ body: 'corpo originale' });
    await repo.insert(d);

    const updated = { ...d, body: 'corpo modificato', title: 'Nuovo titolo' };
    await repo.update(updated);

    const got = await repo.getById(d.id);
    expect(got?.body).toBe('corpo modificato');
    expect(got?.title).toBe('Nuovo titolo');

    const revs = await repo.getRevisions(d.id);
    expect(revs).toHaveLength(1);
    expect(revs[0]?.body).toBe('corpo originale');
    expect(typeof revs[0]?.savedAt).toBe('string');
  });

  it('update con body uguale NON appende revisione', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const d = mkDream({ body: 'stesso corpo' });
    await repo.insert(d);
    await repo.update({ ...d, title: 'solo titolo cambia' });
    expect(await repo.getRevisions(d.id)).toEqual([]);
  });

  it('update non modifica il seed (immutabile)', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const d = mkDream();
    await repo.insert(d);
    // prova a cambiare seed nell'oggetto: il repo non lo scritturebbe comunque
    const attempt = { ...d, seed: 'deadbeef', title: 'x' } as Dream;
    await repo.update(attempt);
    const got = await repo.getById(d.id);
    expect(got?.seed).toBe(d.seed); // seed originale preservato
  });

  it('softDelete nasconde da listAll (default)', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const d = mkDream({ id: 'D'.repeat(26) });
    await repo.insert(d);
    await repo.softDelete(d.id);

    expect(await repo.listAll()).toEqual([]);
    // ma getById lo trova ancora (soft, non fisico)
    expect(await repo.getById(d.id)).not.toBeNull();
    expect((await repo.getById(d.id))?.deletedAt).not.toBeNull();
  });

  it('listAll includeDeleted: true mostra i soft-deleted', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const d = mkDream({ id: 'E'.repeat(26) });
    await repo.insert(d);
    await repo.softDelete(d.id);
    const all = await repo.listAll({ includeDeleted: true });
    expect(all).toHaveLength(1);
  });

  it('restore annulla il soft-delete', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const d = mkDream({ id: 'F'.repeat(26) });
    await repo.insert(d);
    await repo.softDelete(d.id);
    expect(await repo.listAll()).toEqual([]);
    await repo.restore(d.id);
    const all = await repo.listAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.deletedAt).toBeNull();
  });

  it('search per parola (LIKE fallback) trova titolo e body', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    await repo.insert(
      mkDream({ id: 'G'.repeat(26), title: 'Il mare', body: 'spiaggia assolata' }),
    );
    await repo.insert(
      mkDream({ id: 'H'.repeat(26), title: 'montagna', body: 'neve ovunque mare' }),
    );
    // "mare" compare in entrambi (titolo / body)
    const res = await repo.search('mare');
    expect(res).toHaveLength(2);
    // query vuota → []
    expect(await repo.search('   ')).toEqual([]);
  });

  it('search esclude i soft-deleted', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const a = mkDream({ id: 'I'.repeat(26), title: 'oceano', body: 'x' });
    await repo.insert(a);
    await repo.softDelete(a.id);
    expect(await repo.search('oceano')).toEqual([]);
  });

  it('insert idempotente (INSERT OR IGNORE su id dup)', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const d = mkDream();
    await repo.insert(d);
    // re-insert non duplica né lancia
    await repo.insert(d);
    expect(await repo.listAll({ includeDeleted: true })).toHaveLength(1);
  });

  it('getRevisions ordina per savedAt DESC (più recente prima)', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const d = mkDream({ body: 'v0' });
    await repo.insert(d);
    await repo.update({ ...d, body: 'v1' });
    // piccolo ritardo per avere savedAt diverso (ms)
    await new Promise((r) => setTimeout(r, 5));
    await repo.update({ ...d, body: 'v2' });
    const revs = await repo.getRevisions(d.id);
    expect(revs).toHaveLength(2);
    const first = revs[0]?.savedAt ?? '';
    const second = revs[1]?.savedAt ?? '';
    expect(first >= second).toBe(true);
  });

  it('search: path FTS5 (backend che supporta MATCH) ritorna righe', async () => {
    // DB fittizio che "supporta" FTS5: restituisce una riga canned per la query
    // MATCH, coprendo il branch di successo (linea `return rows.map`).
    const canned = {
      id: 'FTS01',
      created_at: '2025-06-01T00:00:00.000Z',
      dreamed_on: '2025-06-01',
      title: 'Mare',
      body: 'acqua',
      emotion: 'calma',
      lucidity: 0,
      no_recall: 0,
      seed: 'abcd1234',
      deleted_at: null,
    };
    const ftsDb: DB = {
      async exec(): Promise<void> {
        /* no-op per questo test */
      },
      async query<T>(sql: string): Promise<T[]> {
        if (sql.includes('MATCH')) return [canned] as unknown as T[];
        return [] as unknown as T[];
      },
    };
    const repo = new DreamRepo(ftsDb);
    const res = await repo.search('mare');
    expect(res).toHaveLength(1);
    expect(res[0]?.id).toBe('FTS01');
  });
});
