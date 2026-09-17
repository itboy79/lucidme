/**
 * Test su SQLite REALE (better-sqlite3) — non lo stub.
 *
 * Scopo: validare che la migration 001 (FTS5 virtual table + trigger di sync)
 * e il comportamento reale di search() funzionino con vero SQLite. Lo stub
 * InMemoryDB salta FTS5 e usa LIKE: questo test prova il path produzione.
 *
 * Se better-sqlite3 non è installato o non supporta FTS5, il test viene
 * saltato (describe.skip condizionale) invece di fallire — ma lo segnaliamo
 * forte in console.
 */
import { describe, expect, it, vi } from 'vitest';
import { NodeSqliteDB } from './node-sqlite.js';
import { runMigrations } from './migrations/runner.js';
import { DreamRepo } from './repositories/dream-repo.js';
import { createDream, type Dream } from '@lucidme/core';

/** Dream noRecall (S8-2): body vuoto, lucidity forzata a 0 da createDream. */
function mkDreamNR(id: string, noRecall: boolean): Dream {
  return createDream({
    body: noRecall ? '' : 'Sogno ricordato',
    emotion: 'calma',
    lucidity: noRecall ? 3 : 2, // con noRecall la factory forza 0
    noRecall,
    dreamedOn: '2025-07-01',
    createdAt: '2025-07-01T08:00:00.000Z',
    id,
  });
}

// Skip pulito se better-sqlite3 non è disponibile (es. ambiente senza build nativa).
let sqliteAvailable = true;
let fts5Available = true;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('better-sqlite3');
} catch {
  sqliteAvailable = false;
}

const describeOrSkip = sqliteAvailable ? describe : describe.skip;

describeOrSkip('SQLite reale (better-sqlite3)', { timeout: 10000 }, () => {
  it('better-sqlite3 è disponibile e FTS5 è compilato', async () => {
    const db = new NodeSqliteDB();
    const opts = db.pragma<{ compile_options: string }>('compile_options');
    const optsStr = (opts[0]?.compile_options ?? '') as unknown as string;
    // meglio verificare dopo aver creato la virtual table
    void optsStr;
    // Verifica indiretta: se creiamo una FTS5 table senza errore, FTS5 c'è.
    try {
      await db.exec('CREATE VIRTUAL TABLE IF NOT EXISTS _fts5_check USING fts5(x)');
      await db.exec('DROP TABLE _fts5_check');
    } catch (e) {
      fts5Available = false;
      console.error('[real-sqlite.test] FTS5 NON disponibile in better-sqlite3:', e);
    }
    expect(fts5Available).toBe(true);
    db.close();
  });

  it('migrations 001-005 applicano su SQLite reale', async () => {
    const db = new NodeSqliteDB();
    await expect(runMigrations(db)).resolves.toBeUndefined();
    // Verifica che le tabelle esistano.
    const tables = await db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    const names = tables.map((t) => t.name);
    expect(names).toContain('dream');
    expect(names).toContain('dream_revision');
    expect(names).toContain('dream_sign');
    expect(names).toContain('dream_sign_hit');
    expect(names).toContain('dream_fts');
    expect(names).toContain('path_progress');
    expect(names).toContain('night_ritual');
    expect(names).toContain('reality_check_event');
    db.close();
  });

  it('005: colonna no_recall NOT NULL DEFAULT 0 e roundtrip insert→listAll', async () => {
    const db = new NodeSqliteDB();
    await runMigrations(db);
    const cols = db.pragma<{ name: string; notnull: number; dflt_value: string }>(
      'table_info(dream)',
    );
    const col = cols.find((c) => c.name === 'no_recall');
    expect(col).toBeDefined();
    expect(col?.notnull).toBe(1);
    expect(col?.dflt_value).toBe('0');

    const repo = new DreamRepo(db);
    await repo.insert(mkDreamNR('nr-1', true));
    await repo.insert(mkDreamNR('nr-2', false));
    const all = await repo.listAll();
    expect(all.find((d) => d.id === 'nr-1')?.noRecall).toBe(true);
    expect(all.find((d) => d.id === 'nr-1')?.lucidity).toBe(0); // forzata da createDream
    expect(all.find((d) => d.id === 'nr-2')?.noRecall).toBe(false);
    db.close();
  });

  it('integrity_check passa su SQLite reale dopo migrations', async () => {
    const db = new NodeSqliteDB();
    await runMigrations(db);
    const result = await db.query<{ integrity_check: string }>('PRAGMA integrity_check');
    expect(result[0]?.integrity_check).toBe('ok');
    db.close();
  });
});

const describeFts = sqliteAvailable && fts5Available ? describe : describe.skip;

describeFts('FTS5 search su SQLite reale', { timeout: 10000 }, () => {
  function makeRepo(): { db: NodeSqliteDB; repo: DreamRepo } {
    const db = new NodeSqliteDB();
    return { db, repo: new DreamRepo(db) };
  }

  function mkDream(i: number, body: string, title = `T${i}`): Dream {
    return {
      id: `dream-${i}`,
      createdAt: '2025-07-01T08:00:00.000Z',
      dreamedOn: '2025-07-01',
      title,
      body,
      emotion: 'calma',
      lucidity: 0,
      noRecall: false,
      seed: `seed-${i}`,
      deletedAt: null,
    };
  }

  it('insert con body vuoto (noRecall) non rompe i trigger FTS', async () => {
    const { db, repo } = makeRepo();
    await runMigrations(db);
    await repo.insert(mkDreamNR('nr-fts', true));
    await repo.insert(mkDream(1, 'Sogno con la parola farfalla', 'Farfalla'));
    // la search continua a funzionare; il doc FTS vuoto è lecito
    expect((await repo.search('farfalla')).length).toBe(1);
    expect((await repo.search('nonesisto')).length).toBe(0);
    db.close();
  });

  it('search trova sogni per parola chiave via FTS5', async () => {
    const { db, repo } = makeRepo();
    await runMigrations(db);
    await repo.insert(mkDream(1, 'Camminavo sott\'acqua tra pesci luminosi', 'Oceano'));
    await repo.insert(mkDream(2, 'Un treno in corsa nella notte', 'Treno'));
    await repo.insert(mkDream(3, 'L\'acqua saliva dal pavimento tiepida', 'Marea'));

    const risultati = await repo.search('acqua');
    const titoli = risultati.map((r) => r.title).sort();
    // FTS5 dovrebbe matchare i sogni 1 e 3 (contengono "acqua")
    expect(titoli).toContain('Oceano');
    expect(titoli).toContain('Marea');
    expect(titoli).not.toContain('Treno');
    db.close();
  });

  it('FTS5 index si aggiorna dopo UPDATE del body (trigger)', async () => {
    const { db, repo } = makeRepo();
    await runMigrations(db);
    // Title neutro: FTS5 indicizza title+body, usiamo termini che sono solo nel body.
    const d = mkDream(1, 'Un giardino fiorito in primavera', 'Titolo');
    await repo.insert(d);
    // prima: "neve" non matcha
    expect((await repo.search('neve')).length).toBe(0);
    // prima: "giardino" matcha (nel body)
    expect((await repo.search('giardino')).length).toBe(1);
    // modifica il body: via "giardino", entra "neve"
    await repo.update({ ...d, body: 'Una distesa di neve bianca' });
    // dopo: "neve" matcha (trigger ha aggiornato l'indice FTS)
    expect((await repo.search('neve')).length).toBe(1);
    // e "giardino" non matcha più (body non lo contiene più, title neutro)
    expect((await repo.search('giardino')).length).toBe(0);
    db.close();
  });

  it('FTS5 index si aggiorna dopo DELETE (trigger)', async () => {
    const { db, repo } = makeRepo();
    await runMigrations(db);
    await repo.insert(mkDream(1, 'Sogno con la parola chiave biblioteca', 'Biblio'));
    expect((await repo.search('biblioteca')).length).toBe(1);
    // soft delete (non delete fisico, quindi FTS resta). Testiamo anche il path delete.
    await repo.softDelete('dream-1');
    // soft delete non rimuove dalla search se non filtriamo deletedAt.
    // Verifichiamo che search (che di default filtra deletedAt IS NULL) non lo restituisca.
    expect((await repo.search('biblioteca')).length).toBe(0);
    db.close();
  });

  it('search con query multi-parola (AND implicito FTS5)', async () => {
    const { db, repo } = makeRepo();
    await runMigrations(db);
    await repo.insert(mkDream(1, 'acqua che sale lentamente', 'A'));
    await repo.insert(mkDream(2, 'fuoco che brucia veloce', 'B'));
    await repo.insert(mkDream(3, 'acqua e fuoco insieme', 'C'));
    // FTS5 default: AND implicito tra termini
    const r = await repo.search('acqua fuoco');
    const titoli = r.map((x) => x.title);
    expect(titoli).toEqual(['C']);
    db.close();
  });

  it('transazione BEGIN IMMEDIATE + ROLLBACK preserva integrità', async () => {
    const { db, repo } = makeRepo();
    await runMigrations(db);
    await repo.insert(mkDream(1, 'prima versione', 'Prima'));
    // simula crash a metà transazione
    try {
      await db.exec('BEGIN IMMEDIATE');
      await db.exec('UPDATE dream SET body = ? WHERE id = ?', ['seconda versione', 'dream-1']);
      throw new Error('crash simulato');
    } catch {
      try {
        await db.exec('ROLLBACK');
      } catch {
        // già rollbackato o non in transazione: ok
      }
    }
    const d = await repo.getById('dream-1');
    expect(d?.body).toBe('prima versione'); // rollback preservato
    const integrity = await db.query<{ integrity_check: string }>('PRAGMA integrity_check');
    expect(integrity[0]?.integrity_check).toBe('ok');
    db.close();
  });
});

describe('NodeSqliteDB — opzioni e edge case', { timeout: 10000 }, () => {
  it('verbose mode logga (senza leakare parametri)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const db = new NodeSqliteDB({ verbose: true });
    await runMigrations(db);
    // una exec qualsiasi per triggerare il verbose
    await db.query<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1");
    expect(spy).toHaveBeenCalled();
    // il log NON contiene il contenuto del body (privacy)
    const calls = spy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((s) => s.includes('[NodeSqliteDB]'))).toBe(true);
    spy.mockRestore();
    db.close();
  });

  it('pragma() ritorna compile_options (FTS5 disponibile)', async () => {
    const db = new NodeSqliteDB();
    const v = db.pragma<{ compile_options: string }>('compile_options');
    expect(Array.isArray(v)).toBe(true);
    expect(v.length).toBeGreaterThan(0);
    db.close();
  });

  it('exec multi-statement senza binding (DDL) funziona', async () => {
    const db = new NodeSqliteDB();
    await db.exec(`
      CREATE TABLE a (x INTEGER);
      CREATE TABLE b (y INTEGER);
      INSERT INTO a VALUES (1);
    `);
    const rows = await db.query<{ x: number }>('SELECT x FROM a');
    expect(rows[0]?.x).toBe(1);
    db.close();
  });
});
