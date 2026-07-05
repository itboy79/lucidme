import { describe, expect, it } from 'vitest';
import type { DreamSign } from '@lucidme/core';
import { SignRepo } from './sign-repo.js';
import { makeTestDb } from '../test-harness.js';

function mkSign(overrides: Partial<DreamSign> = {}): DreamSign {
  return { id: 'SIGN01', label: 'acqua', autoDetected: true, ...overrides };
}

describe('SignRepo', () => {
  it('upsert + list (ordine per label ASC)', async () => {
    const db = await makeTestDb();
    const repo = new SignRepo(db);
    await repo.upsert(mkSign({ id: 'A', label: 'volare' }));
    await repo.upsert(mkSign({ id: 'B', label: 'acqua' }));
    const list = await repo.list();
    expect(list.map((s) => s.label)).toEqual(['acqua', 'volare']);
    expect(list[0]?.autoDetected).toBe(true);
  });

  it('upsert aggiorna un sign esistente (ON CONFLICT id)', async () => {
    const db = await makeTestDb();
    const repo = new SignRepo(db);
    await repo.upsert(mkSign({ id: 'A', label: 'acqua', autoDetected: true }));
    await repo.upsert(mkSign({ id: 'A', label: 'acqua', autoDetected: false }));
    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.autoDetected).toBe(false);
  });

  it('delete rimuove un sign', async () => {
    const db = await makeTestDb();
    const repo = new SignRepo(db);
    await repo.upsert(mkSign({ id: 'A', label: 'acqua' }));
    await repo.upsert(mkSign({ id: 'B', label: 'volare' }));
    await repo.delete('A');
    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('B');
  });

  it('autoDetected false → stored come 0, letto come false', async () => {
    const db = await makeTestDb();
    const repo = new SignRepo(db);
    await repo.upsert(mkSign({ id: 'A', label: 'x', autoDetected: false }));
    const list = await repo.list();
    expect(list[0]?.autoDetected).toBe(false);
  });
});
