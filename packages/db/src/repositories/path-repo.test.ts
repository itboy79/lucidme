/**
 * Test di `PathRepo` (§S3-3 DoD).
 *
 *  - markComplete scrive una riga;
 *  - getCurrentDay ritorna il prossimo (ultimo + 1);
 *  - non si può completare un giorno futuro (fuori sequenza);
 *  - non si può completare due volte lo stesso giorno solare;
 *  - ripristino stato: dopo ricarica, il progresso è corretto.
 *
 * La regola "un giorno per giorno solare" usa la data reale (todayKey =
 * timezone device). Per testarla senza manipolare l'orologio, nei test che
 * verificano il blocco same-day sfruttiamo il fatto che due chiamate
 * markComplete nello stesso test cadono per forza nello stesso giorno solare.
 */
import { describe, it, expect } from 'vitest';
import { makeTestDb } from '../test-harness.js';
import type { DB } from '../client.js';
import { PathRepo, PATH_MAX_DAY } from './path-repo.js';

async function freshRepo(): Promise<{ db: DB; repo: PathRepo }> {
  const db = await makeTestDb();
  return { db, repo: new PathRepo(db) };
}

describe('PathRepo — §S3-3', () => {
  it('getCurrentDay ritorna 1 a inizio percorso', async () => {
    const { repo } = await freshRepo();
    expect(await repo.getCurrentDay()).toBe(1);
  });

  it('markComplete(1) scrive una riga e getCurrentDay avanza a 2', async () => {
    const { repo } = await freshRepo();
    await repo.markComplete(1, 'recall');
    expect(await repo.getCurrentDay()).toBe(2);
    const progress = await repo.getProgress();
    expect(progress.length).toBe(1);
    expect(progress[0]?.day).toBe(1);
    expect(progress[0]?.technique).toBe('recall');
  });

  it('canCompleteDay rispetta la sequenza (non puoi fare il giorno 3 prima del 2)', async () => {
    const { repo } = await freshRepo();
    expect(await repo.canCompleteDay(1)).toBe(true);
    expect(await repo.canCompleteDay(2)).toBe(false); // fuori sequenza
    expect(await repo.canCompleteDay(3)).toBe(false);
  });

  it('markComplete di un giorno fuori sequenza LANCIA', async () => {
    const { repo } = await freshRepo();
    await expect(repo.markComplete(3)).rejects.toThrow(/non completabile/i);
  });

  it('NON puoi completare due giorni nello stesso giorno solare (regola bloccante)', async () => {
    const { repo } = await freshRepo();
    await repo.markComplete(1, 'recall');
    // stesso giorno solare: giorno 2 non è completabile (aspetta domani)
    expect(await repo.canCompleteDay(2)).toBe(false);
    await expect(repo.markComplete(2)).rejects.toThrow(/non completabile/i);
  });

  it('dopo un completamento, getCurrentDay è il successivo ma resta bloccato finché non cambia giorno', async () => {
    const { repo } = await freshRepo();
    await repo.markComplete(1, 'recall');
    expect(await repo.getCurrentDay()).toBe(2); // prossimo giorno
    expect(await repo.canCompleteDay(2)).toBe(false); // ma non oggi
  });

  it('markComplete dello stesso giorno due volte: la seconda è bloccata (same-day)', async () => {
    const { repo } = await freshRepo();
    await repo.markComplete(1, 'recall');
    // riprova giorno 1: la sequenza direbbe 2, ma canCompleteDay(1)=false comunque
    await expect(repo.markComplete(1)).rejects.toThrow(/non completabile/i);
  });

  it('getProgress ritorna tutti i completamenti ordinati per giorno', async () => {
    const { repo } = await freshRepo();
    // Simuliamo completamenti di giorni diversi inserendo direttamente nel db
    // per bypassare la regola same-day (che blocca nel的现实 temporale).
    await repo.markComplete(1);
    // per inserire giorni successivi nello stesso test, manipoliamo completed_at
    // a date passate così la regola same-day non blocca.
    const db = (repo as unknown as { db: DB }).db;
    const past = (daysAgo: number): string => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString();
    };
    await db.exec('DELETE FROM path_progress WHERE user_id = ?', ['local']);
    await db.exec(
      'INSERT INTO path_progress (user_id, day, completed_at, technique) VALUES (?, ?, ?, ?)',
      ['local', 1, past(3), 'recall'],
    );
    await db.exec(
      'INSERT INTO path_progress (user_id, day, completed_at, technique) VALUES (?, ?, ?, ?)',
      ['local', 2, past(2), 'RT'],
    );
    await db.exec(
      'INSERT INTO path_progress (user_id, day, completed_at, technique) VALUES (?, ?, ?, ?)',
      ['local', 3, past(1), 'RT'],
    );
    const progress = await repo.getProgress();
    expect(progress.map((p) => p.day)).toEqual([1, 2, 3]);
    expect(await repo.getCurrentDay()).toBe(4);
    expect(await repo.getCompletedCount()).toBe(3);
  });

  it('getCurrentDay è capped a PATH_MAX_DAY (21) quando tutto è completato', async () => {
    const { repo } = await freshRepo();
    const db = (repo as unknown as { db: DB }).db;
    const past = new Date();
    past.setDate(past.getDate() - 1);
    const iso = past.toISOString();
    await db.exec(
      'INSERT INTO path_progress (user_id, day, completed_at, technique) VALUES (?, ?, ?, ?)',
      ['local', PATH_MAX_DAY, iso, 'TLR'],
    );
    expect(await repo.getCurrentDay()).toBe(PATH_MAX_DAY);
  });

  it('ripristino stato: nuovo PathRepo sulla stessa DB vede il progresso', async () => {
    const { db, repo } = await freshRepo();
    await repo.markComplete(1, 'recall');
    // simula riavvio: nuovo repo, stesso db
    const repo2 = new PathRepo(db);
    expect(await repo2.getCurrentDay()).toBe(2);
    expect((await repo2.getProgress()).length).toBe(1);
  });

  it('canCompleteDay(0) e giorni negativi sono sempre false', async () => {
    const { repo } = await freshRepo();
    expect(await repo.canCompleteDay(0)).toBe(false);
    expect(await repo.canCompleteDay(-1)).toBe(false);
  });

  it('technique è opzionale (null se omessa)', async () => {
    const { repo } = await freshRepo();
    await repo.markComplete(1);
    const progress = await repo.getProgress();
    expect(progress[0]?.technique).toBeNull();
  });

  it('markComplete su DB che lancia in scrittura → rollback e rilancia', async () => {
    // DB che legge OK ma INSERT lanzia. markComplete(1) prima fa canCompleteDay
    // (che legge), poi BEGIN + INSERT. Facciamo lanciare solo l'INSERT.
    const base = await makeTestDb();
    const throwing: DB = {
      async exec(sql: string, params?: unknown[]) {
        if (/^INSERT/i.test(sql.trim())) throw new Error('boom');
        return base.exec(sql, params);
      },
      async query<T>(sql: string, params?: unknown[]) {
        return base.query<T>(sql, params);
      },
    };
    const repo = new PathRepo(throwing);
    await expect(repo.markComplete(1, 'recall')).rejects.toThrow('boom');
  });
});
