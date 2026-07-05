/**
 * Test di `NightRepo` (§S4-1 DoD).
 *
 *  - getToday ritorna null all'inizio;
 *  - upsert crea la riga con default false;
 *  - toggle dei tre gesti persiste immediatamente;
 *  - setWbtbTime aggiorna solo l'orario;
 *  - nuova data = nuovo rituale (reset a mezzanotte);
 *  - sopravvive a "kill" (nuovo repo, stesso db).
 */
import { describe, it, expect } from 'vitest';
import { makeTestDb } from '../test-harness.js';
import type { DB } from '../client.js';
import { NightRepo, todayKey } from './night-repo.js';

async function freshRepo(date = '2025-07-05'): Promise<{ db: DB; repo: NightRepo; date: string }> {
  const db = await makeTestDb();
  return { db, repo: new NightRepo(db), date };
}

describe('NightRepo — §S4-1', () => {
  it('getToday ritorna null se non ancora iniziato', async () => {
    const { repo, date } = await freshRepo();
    expect(await repo.getToday(date)).toBeNull();
  });

  it('upsert crea una riga con flag false di default', async () => {
    const { repo, date } = await freshRepo();
    const r = await repo.upsert({ date });
    expect(r.mildDone).toBe(false);
    expect(r.tlrDone).toBe(false);
    expect(r.signsDone).toBe(false);
    expect(r.wbtbTime).toBeNull();
    expect(r.date).toBe(date);
  });

  it('toggleMild inverte e persiste', async () => {
    const { repo, date } = await freshRepo();
    const after = await repo.toggleMild(date);
    expect(after.mildDone).toBe(true);
    // rilettura dal db: sopravvive
    const reread = await repo.getToday(date);
    expect(reread?.mildDone).toBe(true);
    const off = await repo.toggleMild(date);
    expect(off.mildDone).toBe(false);
  });

  it('toggleTlr e toggleSigns indipendenti', async () => {
    const { repo, date } = await freshRepo();
    await repo.toggleTlr(date);
    await repo.toggleSigns(date);
    const r = await repo.getToday(date);
    expect(r?.tlrDone).toBe(true);
    expect(r?.signsDone).toBe(true);
    expect(r?.mildDone).toBe(false);
  });

  it('setWbtbTime aggiorna solo l\'orario senza toccare i flag', async () => {
    const { repo, date } = await freshRepo();
    await repo.toggleMild(date);
    await repo.setWbtbTime('04:40', date);
    const r = await repo.getToday(date);
    expect(r?.wbtbTime).toBe('04:40');
    expect(r?.mildDone).toBe(true);
  });

  it('nuova data = nuovo rituale (reset a mezzanotte)', async () => {
    const { repo, date } = await freshRepo();
    await repo.toggleMild(date);
    // il giorno dopo: rituale vuoto
    const next = await repo.getToday('2025-07-06');
    expect(next).toBeNull();
    await repo.toggleMild('2025-07-06');
    const today = await repo.getToday(date);
    const tomorrow = await repo.getToday('2025-07-06');
    expect(today?.mildDone).toBe(true);
    expect(tomorrow?.mildDone).toBe(true); // indipendenti
  });

  it('sopravvive a kill: nuovo repo sullo stesso db vede lo stato', async () => {
    const { db, repo, date } = await freshRepo();
    await repo.toggleMild(date);
    await repo.toggleSigns(date);
    const repo2 = new NightRepo(db);
    const r = await repo2.getToday(date);
    expect(r?.mildDone).toBe(true);
    expect(r?.signsDone).toBe(true);
  });

  it('upsert merge: campo non fornito resta al valore attuale', async () => {
    const { repo, date } = await freshRepo();
    await repo.upsert({ date, mildDone: true });
    // un secondo upsert senza mildDone NON resetta mildDone
    await repo.upsert({ date, tlrDone: true });
    const r = await repo.getToday(date);
    expect(r?.mildDone).toBe(true);
    expect(r?.tlrDone).toBe(true);
  });

  it('todayKey produce formato YYYY-MM-DD', () => {
    const k = todayKey(new Date('2025-07-05T23:30:00.000Z'));
    // formato valido (10 char, due trattini)
    expect(k).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('upsert su DB che lancia in scrittura → rollback e rilancia', async () => {
    // DB che legge OK ma scrive lanzando.
    const base = await makeTestDb();
    const throwing: DB = {
      async exec(sql: string, params?: unknown[]) {
        if (sql.startsWith('INSERT')) throw new Error('boom');
        return base.exec(sql, params);
      },
      async query<T>(sql: string, params?: unknown[]) {
        return base.query<T>(sql, params);
      },
    };
    const repo = new NightRepo(throwing);
    await expect(repo.upsert({ date: '2025-07-05', mildDone: true })).rejects.toThrow(
      'boom',
    );
  });

  it('setWbtbTime(null) pulisce l\'orario', async () => {
    const { repo, date } = await freshRepo();
    await repo.setWbtbTime('04:40', date);
    expect((await repo.getToday(date))?.wbtbTime).toBe('04:40');
    await repo.setWbtbTime(null, date);
    expect((await repo.getToday(date))?.wbtbTime).toBeNull();
  });
});
