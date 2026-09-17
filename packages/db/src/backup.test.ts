import { describe, expect, it } from 'vitest';
import type { Dream } from '@lucidme/core';
import { createDream } from '@lucidme/core';
import { exportJSON, exportMarkdown, importJSON, validateExportPayload } from './backup.js';
import { DreamRepo } from './repositories/dream-repo.js';
import { SignRepo } from './repositories/sign-repo.js';
import { makeTestDb } from './test-harness.js';

function mkDream(overrides: Partial<Dream> = {}): Dream {
  return createDream({
    title: 'Spiaggia',
    body: 'Camminavo sulla spiaggia.',
    emotion: 'calma',
    lucidity: 2,
    dreamedOn: '2025-06-01',
    createdAt: '2025-06-01T08:00:00.000Z',
    id: '01HWBACKUPTEST00000000000A',
    ...overrides,
  });
}

describe('exportJSON / importJSON round-trip', () => {
  it('import(export(x)) ritorna gli stessi sogni (idempotente)', async () => {
    const dbSrc = await makeTestDb();
    const src = new DreamRepo(dbSrc);
    const dbDst = await makeTestDb();
    const dst = new DreamRepo(dbDst);

    const d1 = mkDream({ id: 'A'.repeat(26) });
    const d2 = mkDream({
      id: 'B'.repeat(26),
      title: 'Montagna',
      body: 'Altro corpo',
      dreamedOn: '2025-06-09',
    });
    await src.insert(d1);
    await src.insert(d2);

    const payload = await exportJSON(src);
    expect(payload.version).toBe(1);
    expect(payload.dreams).toHaveLength(2);
    expect(payload.exportedAt).toMatch(/^\d{4}-/);

    const { inserted, skipped } = await importJSON(payload, dst);
    expect(inserted).toBe(2);
    expect(skipped).toBe(0);

    const got = await dst.listAll({ includeDeleted: true });
    expect(got).toHaveLength(2);
    // stessi id e stessi campi (a parte ordinamento)
    const byId = new Map(got.map((d) => [d.id, d]));
    expect(byId.get('A'.repeat(26))?.title).toBe('Spiaggia');
    expect(byId.get('B'.repeat(26))?.title).toBe('Montagna');
  });

  it('importJSON è idempotente su id (skip se esiste)', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    await repo.insert(mkDream({ id: 'C'.repeat(26) }));
    const payload = {
      version: 1 as const,
      exportedAt: '2025-06-01T00:00:00.000Z',
      dreams: [
        mkDream({ id: 'C'.repeat(26) }), // esiste già
        mkDream({ id: 'D'.repeat(26) }), // nuovo
      ],
      signs: [],
    };
    const res = await importJSON(payload, repo);
    expect(res).toEqual({ inserted: 1, skipped: 1 });
  });

  it('importJSON rifiuta payload non valido', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    await expect(importJSON({ version: 2 }, repo)).rejects.toThrow();
    await expect(
      importJSON({ version: 1, exportedAt: 'x', dreams: 'noarray', signs: [] }, repo),
    ).rejects.toThrow();
  });

  it('exportJSON include noRecall e il roundtrip lo preserva (S8-2)', async () => {
    const dbSrc = await makeTestDb();
    const src = new DreamRepo(dbSrc);
    const dbDst = await makeTestDb();
    const dst = new DreamRepo(dbDst);

    const nr = mkDream({ id: 'P'.repeat(26), body: '', noRecall: true, lucidity: 0 });
    const normal = mkDream({ id: 'Q'.repeat(26) });
    await src.insert(nr);
    await src.insert(normal);

    const payload = await exportJSON(src);
    const exportedNr = payload.dreams.find((d) => d.id === nr.id);
    const exportedNormal = payload.dreams.find((d) => d.id === normal.id);
    expect(exportedNr?.noRecall).toBe(true);
    expect(exportedNormal?.noRecall).toBe(false);

    await importJSON(payload, dst);
    const got = await dst.listAll({ includeDeleted: true });
    expect(got.find((d) => d.id === nr.id)?.noRecall).toBe(true);
    expect(got.find((d) => d.id === normal.id)?.noRecall).toBe(false);
  });

  it('importJSON accetta payload legacy senza noRecall (→ false)', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const legacy = mkDream({ id: 'R'.repeat(26) });
    const payload = {
      version: 1 as const,
      exportedAt: '2025-06-01T00:00:00.000Z',
      // simula un export pre-005: campo noRecall assente
      dreams: [{ ...legacy, noRecall: undefined }],
      signs: [],
    };
    const res = await importJSON(payload, repo);
    expect(res.inserted).toBe(1);
    const got = await repo.listAll();
    expect(got[0]?.noRecall).toBe(false);
  });

  it('exportJSON include i soft-deleted e i sign', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const signRepo = new SignRepo(db);
    await repo.insert(mkDream({ id: 'E'.repeat(26) }));
    await repo.insert(mkDream({ id: 'F'.repeat(26) }));
    await repo.softDelete('F'.repeat(26));
    await signRepo.upsert({ id: 'SGN1', label: 'acqua', autoDetected: true });

    const payload = await exportJSON(repo, signRepo);
    expect(payload.dreams).toHaveLength(2); // include deleted
    expect(payload.signs).toEqual([{ id: 'SGN1', label: 'acqua', autoDetected: true }]);
  });

  it('exportJSON senza signRepo → signs: []', async () => {
    const db = await makeTestDb();
    const repo = new DreamRepo(db);
    const payload = await exportJSON(repo);
    expect(payload.signs).toEqual([]);
  });
});

describe('exportMarkdown', () => {
  it('una sezione ## per sogno con meta e body', () => {
    const dreams = [
      mkDream({
        id: 'A'.repeat(26),
        title: 'Il mare',
        body: 'Corpo del sogno.',
        emotion: 'gioia',
        lucidity: 3,
        dreamedOn: '2025-07-01',
      }),
    ];
    const md = exportMarkdown(dreams);
    expect(md).toContain('## Il mare');
    expect(md).toContain('*2025-07-01 · gioia · pieno controllo*');
    expect(md).toContain('Corpo del sogno.');
  });

  it('più sogni → più sezioni separate da riga vuota', () => {
    const md = exportMarkdown([
      mkDream({ id: 'A'.repeat(26), title: 'A', body: 'a' }),
      mkDream({ id: 'B'.repeat(26), title: 'B', body: 'b' }),
    ]);
    expect(md.match(/^## /gm)?.length).toBe(2);
  });

  it('entry noRecall: body renderizzato come segnaposto (S8-2)', () => {
    const md = exportMarkdown([
      mkDream({ id: 'A'.repeat(26), title: 'Mattina', body: '', noRecall: true, lucidity: 0 }),
    ]);
    expect(md).toContain('_(sogno non ricordato)_');
    // meta con emotion e label lucidità (0 = non lucido)
    expect(md).toMatch(/\*2025-06-01 · calma · non lucido\*/);
  });

  it('entry noRecall con body non vuoto: prevale il segnaposto', () => {
    const md = exportMarkdown([
      mkDream({ id: 'B'.repeat(26), body: 'frammento residuo', noRecall: true }),
    ]);
    expect(md).toContain('_(sogno non ricordato)_');
    expect(md).not.toContain('frammento residuo');
  });
});

describe('validateExportPayload', () => {
  it('valido → null', () => {
    expect(
      validateExportPayload({
        version: 1,
        exportedAt: '2025-06-01T00:00:00.000Z',
        dreams: [],
        signs: [],
      }),
    ).toBeNull();
  });

  it('dream con emotion non valida → errore', () => {
    const err = validateExportPayload({
      version: 1,
      exportedAt: 'x',
      dreams: [
        {
          id: 'id1',
          createdAt: '2025-06-01T00:00:00.000Z',
          dreamedOn: '2025-06-01',
          title: 't',
          body: 'b',
          emotion: 'ronfante',
          lucidity: 0,
          seed: 's',
          deletedAt: null,
        },
      ],
      signs: [],
    });
    expect(err).toContain('emotion');
  });

  it('dream con dreamedOn malformato → errore', () => {
    const err = validateExportPayload({
      version: 1,
      exportedAt: 'x',
      dreams: [
        {
          id: 'id1',
          createdAt: 'x',
          dreamedOn: '01-01-2025',
          title: 't',
          body: 'b',
          emotion: 'calma',
          lucidity: 0,
          seed: 's',
          deletedAt: null,
        },
      ],
      signs: [],
    });
    expect(err).toContain('dreamedOn');
  });

  it('sign con autoDetected non boolean → errore', () => {
    const err = validateExportPayload({
      version: 1,
      exportedAt: 'x',
      dreams: [],
      signs: [{ id: 's1', label: 'x', autoDetected: 'yes' }],
    });
    expect(err).toContain('autoDetected');
  });

  it('payload non oggetto → errore', () => {
    expect(validateExportPayload(null)).toContain('oggetto');
    expect(validateExportPayload('x')).toContain('oggetto');
    expect(validateExportPayload(42)).toContain('oggetto');
  });

  it('versione sbagliata → errore', () => {
    expect(
      validateExportPayload({ version: 2, exportedAt: 'x', dreams: [], signs: [] }),
    ).toContain('version');
  });

  it('lucidity fuori range → errore', () => {
    const err = validateExportPayload({
      version: 1,
      exportedAt: 'x',
      dreams: [
        {
          id: 'id1',
          createdAt: 'x',
          dreamedOn: '2025-06-01',
          title: 't',
          body: 'b',
          emotion: 'calma',
          lucidity: 9,
          seed: 's',
          deletedAt: null,
        },
      ],
      signs: [],
    });
    expect(err).toContain('lucidity');
  });

  it('noRecall non boolean → errore', () => {
    const err = validateExportPayload({
      version: 1,
      exportedAt: 'x',
      dreams: [
        {
          id: 'id1',
          createdAt: 'x',
          dreamedOn: '2025-06-01',
          title: 't',
          body: 'b',
          emotion: 'calma',
          lucidity: 0,
          noRecall: 1,
          seed: 's',
          deletedAt: null,
        },
      ],
      signs: [],
    });
    expect(err).toContain('noRecall');
  });

  it('dream legacy senza noRecall → valido (default false in import)', () => {
    const err = validateExportPayload({
      version: 1,
      exportedAt: 'x',
      dreams: [
        {
          id: 'id1',
          createdAt: '2025-06-01T00:00:00.000Z',
          dreamedOn: '2025-06-01',
          title: 't',
          body: 'b',
          emotion: 'calma',
          lucidity: 0,
          seed: 's',
          deletedAt: null,
        },
      ],
      signs: [],
    });
    expect(err).toBeNull();
  });

  it('deletedAt non valido (numero) → errore', () => {
    const err = validateExportPayload({
      version: 1,
      exportedAt: 'x',
      dreams: [
        {
          id: 'id1',
          createdAt: 'x',
          dreamedOn: '2025-06-01',
          title: 't',
          body: 'b',
          emotion: 'calma',
          lucidity: 0,
          seed: 's',
          deletedAt: 42,
        },
      ],
      signs: [],
    });
    expect(err).toContain('deletedAt');
  });

  it('dream non oggetto → errore', () => {
    const err = validateExportPayload({
      version: 1,
      exportedAt: 'x',
      dreams: ['not-a-dream'],
      signs: [],
    });
    expect(err).toContain('dreams[0]');
  });

  it('dream con id/createdAt/title/body/seed mancanti → errore specifico', () => {
    const base = { version: 1, exportedAt: 'x', dreams: [{}], signs: [] };
    expect(validateExportPayload(base)).toContain('id mancante');
    expect(
      validateExportPayload({
        ...base,
        dreams: [{ id: 'x' }],
      }),
    ).toContain('createdAt');
    expect(
      validateExportPayload({
        ...base,
        dreams: [{ id: 'x', createdAt: 'c' }],
      }),
    ).toContain('dreamedOn');
    expect(
      validateExportPayload({
        ...base,
        dreams: [{ id: 'x', createdAt: 'c', dreamedOn: '2025-01-01' }],
      }),
    ).toContain('title');
    expect(
      validateExportPayload({
        ...base,
        dreams: [{ id: 'x', createdAt: 'c', dreamedOn: '2025-01-01', title: 't' }],
      }),
    ).toContain('body');
    expect(
      validateExportPayload({
        ...base,
        dreams: [
          {
            id: 'x',
            createdAt: 'c',
            dreamedOn: '2025-01-01',
            title: 't',
            body: 'b',
            emotion: 'calma',
            lucidity: 0,
          },
        ],
      }),
    ).toContain('seed');
  });

  it('sign non oggetto / id mancante / label mancante → errore', () => {
    const base = { version: 1, exportedAt: 'x', dreams: [], signs: [] };
    expect(
      validateExportPayload({ ...base, signs: ['x'] }),
    ).toContain('signs[0]');
    expect(
      validateExportPayload({ ...base, signs: [{}] }),
    ).toContain('id mancante');
    expect(
      validateExportPayload({ ...base, signs: [{ id: 's' }] }),
    ).toContain('label mancante');
  });

  it('sign non è un array → errore', () => {
    const err = validateExportPayload({
      version: 1,
      exportedAt: 'x',
      dreams: [],
      signs: 'noarray',
    });
    expect(err).toContain('signs');
  });

  it('exportedAt non stringa → errore', () => {
    const err = validateExportPayload({
      version: 1,
      exportedAt: 123,
      dreams: [],
      signs: [],
    });
    expect(err).toContain('exportedAt');
  });
});
