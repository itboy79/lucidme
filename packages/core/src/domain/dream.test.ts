import { describe, expect, it } from 'vitest';
import {
  BODY_MAX,
  createDream,
  dreamSeed,
  firstWords,
  LUCIDITY_LABELS,
  LUCIDITY_LEVELS,
  resolveTitle,
  TITLE_FALLBACK_WORDS,
  TITLE_MAX,
  todayLocal,
} from './dream.js';
import { seedHex } from '../crypto/hash.js';
import { DomainError } from './errors.js';

const base = {
  body: 'Sognavo di camminare sulla spiaggia e l\'acqua era calma.',
  emotion: 'calma' as const,
  lucidity: 0 as const,
};

describe('createDream — validazione', () => {
  it('crea un sogno con id/createdAt/seed generati, deletedAt null', () => {
    const d = createDream({ ...base, title: 'Spiaggia' });
    expect(d.id).toMatch(/^[0-9A-Z]{26}$/); // ULID
    expect(d.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(d.seed).toMatch(/^[0-9a-f]{8}$/);
    expect(d.deletedAt).toBeNull();
    expect(d.emotion).toBe('calma');
    expect(d.lucidity).toBe(0);
  });

  it('rispetta id/createdAt/dreamedOn passati (no rigenerazione)', () => {
    const d = createDream({
      ...base,
      title: 'x',
      id: '01HWTESTID0000000000000000',
      createdAt: '2025-06-07T08:00:00.000Z',
      dreamedOn: '2025-06-06',
    });
    expect(d.id).toBe('01HWTESTID0000000000000000');
    expect(d.createdAt).toBe('2025-06-07T08:00:00.000Z');
    expect(d.dreamedOn).toBe('2025-06-06');
  });

  it('rifiuta body vuoto', () => {
    expect(() => createDream({ ...base, body: '' })).toThrowError(DomainError);
    try {
      createDream({ ...base, body: '' });
    } catch (e) {
      expect((e as DomainError).code).toBe('VALIDATION');
    }
  });

  it('rifiuta body oltre BODY_MAX (20_000)', () => {
    const tooLong = 'a'.repeat(BODY_MAX + 1);
    expect(() => createDream({ ...base, body: tooLong })).toThrowError(DomainError);
    try {
      createDream({ ...base, body: tooLong });
    } catch (e) {
      expect((e as DomainError).code).toBe('VALIDATION');
    }
  });

  it('accetta body esattamente a BODY_MAX', () => {
    const exact = 'a'.repeat(BODY_MAX);
    const d = createDream({ ...base, body: exact, title: 'x' });
    expect(d.body).toHaveLength(BODY_MAX);
  });

  it('rifiuta emotion non valida', () => {
    expect(() =>
      createDream({ ...base, emotion: 'ronfante' as never }),
    ).toThrowError(DomainError);
  });

  it('rifiuta lucidity fuori range', () => {
    expect(() => createDream({ ...base, lucidity: 4 as never })).toThrowError(DomainError);
    expect(() => createDream({ ...base, lucidity: -1 as never })).toThrowError(DomainError);
  });

  it('accetta tutti i livelli di lucidità validi', () => {
    for (const l of LUCIDITY_LEVELS) {
      const d = createDream({ ...base, lucidity: l, title: 'x' });
      expect(d.lucidity).toBe(l);
    }
  });
});

describe('createDream — titolo', () => {
  it('title vuoto → prime 6 parole del body + "…"', () => {
    const d = createDream({
      ...base,
      body: 'uno due tre quattro cinque sei sette otto',
    });
    expect(d.title).toBe('uno due tre quattro cinque sei…');
  });

  it('title solo spazi → fallback', () => {
    const d = createDream({ ...base, title: '   ' });
    expect(d.title.endsWith('…')).toBe(true);
    // prime parole del body
    const words = d.title.slice(0, -1).split(' ');
    expect(words.length).toBeLessThanOrEqual(TITLE_FALLBACK_WORDS);
  });

  it('title > 80 char → troncato a 80 + "…"', () => {
    const longTitle = 'T'.repeat(TITLE_MAX + 10);
    const d = createDream({ ...base, title: longTitle });
    // 80 codepoint + ellipsis
    expect(Array.from(d.title).length).toBe(TITLE_MAX + 1);
    expect(d.title.endsWith('…')).toBe(true);
  });

  it('title con emoji lunghe: tronca per codepoint (Array.from)', () => {
    // ogni emoji conta come 2 code unit UTF-16 ma 1 codepoint
    const emoji = '🔥'.repeat(TITLE_MAX + 5);
    const d = createDream({ ...base, title: emoji });
    expect(Array.from(d.title).length).toBe(TITLE_MAX + 1);
  });

  it('title esattamente 80 char resta invariato', () => {
    const exact = 'x'.repeat(TITLE_MAX);
    const d = createDream({ ...base, title: exact });
    expect(d.title).toBe(exact);
    expect(d.title.endsWith('…')).toBe(false);
  });

  it('title < 80 char passa invariato (trim)', () => {
    const d = createDream({ ...base, title: '  Spiaggia  ' });
    expect(d.title).toBe('Spiaggia');
  });
});

describe('createDream — seed determinismo', () => {
  it('seed = seedHex(id + createdAt)', () => {
    const d = createDream({
      ...base,
      title: 'x',
      id: '01HWTESTID0000000000000000',
      createdAt: '2025-06-07T08:00:00.000Z',
    });
    expect(d.seed).toBe(seedHex(d.id, d.createdAt));
  });

  it('seed è immutabile: stesso input → stesso seed', () => {
    const a = createDream({
      ...base,
      title: 'x',
      id: 'FIXEDID0000000000000000',
      createdAt: '2025-06-07T08:00:00.000Z',
    });
    const b = createDream({
      ...base,
      title: 'altro',
      body: 'diverso',
      id: 'FIXEDID0000000000000000',
      createdAt: '2025-06-07T08:00:00.000Z',
    });
    expect(a.seed).toBe(b.seed); // dipende solo da id+createdAt
  });

  it('seed cambia se cambia id o createdAt', () => {
    const mk = (id: string, created: string) =>
      createDream({ ...base, title: 'x', id, createdAt: created }).seed;
    expect(mk('A'.repeat(26), '2025-01-01T00:00:00.000Z')).not.toBe(
      mk('B'.repeat(26), '2025-01-01T00:00:00.000Z'),
    );
    expect(mk('A'.repeat(26), '2025-01-01T00:00:00.000Z')).not.toBe(
      mk('A'.repeat(26), '2025-01-02T00:00:00.000Z'),
    );
  });

  it('dreamSeed coincide con createDream().seed', () => {
    const d = createDream({
      ...base,
      title: 'x',
      id: '01HWTESTID0000000000000000',
      createdAt: '2025-06-07T08:00:00.000Z',
    });
    expect(dreamSeed(d.id, d.createdAt)).toBe(d.seed);
  });
});

describe('createDream — dreamedOn default', () => {
  it('default = oggi in formato YYYY-MM-DD (locale)', () => {
    const d = createDream({ ...base, title: 'x' });
    expect(d.dreamedOn).toBe(todayLocal());
    expect(d.dreamedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('createDream — noRecall (S8-2)', () => {
  it('default: noRecall false su dream normale', () => {
    const d = createDream({ ...base, title: 'x' });
    expect(d.noRecall).toBe(false);
  });

  it('noRecall true accetta body vuoto', () => {
    const d = createDream({ ...base, body: '', noRecall: true });
    expect(d.noRecall).toBe(true);
    expect(d.body).toBe('');
  });

  it('senza noRecall il body vuoto resta rifiutato', () => {
    expect(() => createDream({ ...base, body: '' })).toThrowError(DomainError);
    expect(() => createDream({ ...base, body: '', noRecall: false })).toThrowError(
      DomainError,
    );
  });

  it('noRecall forza lucidity a 0 qualunque valore valido sia passato', () => {
    const d = createDream({ ...base, noRecall: true, lucidity: 3 });
    expect(d.lucidity).toBe(0);
    expect(d.noRecall).toBe(true);
  });

  it('noRecall con lucidity 0 esplicita resta 0', () => {
    const d = createDream({ ...base, noRecall: true, lucidity: 0, body: '' });
    expect(d.lucidity).toBe(0);
  });

  it('noRecall: emotion resta obbligatoria (non valida → errore)', () => {
    expect(() =>
      createDream({ ...base, body: '', noRecall: true, emotion: 'ronfante' as never }),
    ).toThrowError(DomainError);
    try {
      createDream({ ...base, body: '', noRecall: true, emotion: 'ronfante' as never });
    } catch (e) {
      expect((e as DomainError).code).toBe('VALIDATION');
    }
  });

  it('noRecall: lucidity fuori range resta rifiutata (validazione input)', () => {
    expect(() =>
      createDream({ ...base, noRecall: true, lucidity: 4 as never }),
    ).toThrowError(DomainError);
  });

  it('noRecall: body oltre BODY_MAX resta rifiutato', () => {
    const tooLong = 'a'.repeat(BODY_MAX + 1);
    expect(() =>
      createDream({ ...base, noRecall: true, body: tooLong }),
    ).toThrowError(DomainError);
  });

  it('noRecall: title resta opzionale e il seed resta deterministico', () => {
    const d = createDream({
      ...base,
      body: '',
      noRecall: true,
      id: '01HWTESTID0000000000000000',
      createdAt: '2025-06-07T08:00:00.000Z',
    });
    expect(typeof d.title).toBe('string');
    expect(d.seed).toBe(seedHex(d.id, d.createdAt));
  });
});

describe('resolveTitle / firstWords (internal helpers)', () => {
  it('resolveTitle: fallback quando vuoto', () => {
    expect(resolveTitle('', 'uno due tre')).toBe('uno due tre…');
    expect(resolveTitle(undefined, 'uno due tre')).toBe('uno due tre…');
  });

  it('resolveTitle: tronca + ellipsis', () => {
    const long = 'z'.repeat(TITLE_MAX + 3);
    expect(resolveTitle(long, 'body')).toBe('z'.repeat(TITLE_MAX) + '…');
  });

  it('firstWords: prime n parole', () => {
    expect(firstWords('a b c d e f g', 3)).toBe('a b c');
    expect(firstWords('a', 3)).toBe('a');
  });
});

describe('costanti esportate', () => {
  it('LUCIDITY_LEVELS = [0,1,2,3]', () => {
    expect(LUCIDITY_LEVELS).toEqual([0, 1, 2, 3]);
  });

  it('LUCIDITY_LABELS ha 4 voci italiane', () => {
    expect(LUCIDITY_LABELS).toEqual(['non lucido', 'barlume', 'lucido', 'pieno controllo']);
    expect(LUCIDITY_LABELS.length).toBe(4);
  });
});
