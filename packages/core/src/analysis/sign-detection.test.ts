import { describe, expect, it } from 'vitest';
import { detectSigns, tokenize } from './sign-detection.js';
import { STOPWORDS_IT } from './stopwords-it.js';
import type { Dream } from '../domain/dream.js';
import { createDream } from '../domain/dream.js';

/**
 * Fixture italiana (§S2-1 DoD): 10 sogni. "acqua" appare 4 volte, "volare" 3.
 * Devo essere i top-2 sign rilevati.
 *
 * NOTA: v1 NON lemmatizza — il token è la forma esatta. Quindi "volare" deve
 * comparire letteralmente (non "volavo"). Acqua è distribuita 1-per-sogno così
 * il test di soft-delete (rimuove il sogno[3]) abbassa i conteggi in modo pulito.
 *
 * Conteggi attesi:
 *   acqua  = sogni 1,2,4,5 → 4 occorrenze
 *   volare = sogni 2,3,4   → 3 occorrenze
 */
function fixture(): Dream[] {
  const mk = (body: string, dreamedOn = '2025-06-01'): Dream =>
    createDream({
      body,
      emotion: 'meraviglia',
      lucidity: 1,
      dreamedOn,
      id: '01HWFIX' + dreamedOn.replace(/-/g, '') + body.length.toString().padStart(3, '0'),
      createdAt: dreamedOn + 'T08:00:00.000Z',
    });

  return [
    mk('Ho sognato di camminare vicino all\'acqua del mare, era tutto calmo.'), // acqua x1
    mk('L\'acqua scorreva tra le mie mani mentre provavo a volare.'), // acqua x1, volare x1
    mk('Volare sopra le montagne era la sensazione più naturale del mondo.'), // volare x1
    mk('Pioveva forte, acqua ovunque, e volevo volare via.'), // acqua x1, volare x1
    mk('Nuotavo in un\'acqua trasparente e azzurra, leggerissimo.'), // acqua x1
    mk('Un giardino pieno di fiori, sentivo un profumo dolce ovunque.'), // distrattore
    mk('Cadevo in un pozzo profondo ma atterravo dolcemente sull\'erba.'), // distrattore
    mk('Un lupo mi seguiva nel bosco scuro, sentivo i suoi passi.'), // distrattore
    mk('La casa della nonna era identica a come la ricordavo, luce gialla.'), // distrattore
    mk('Parlavo con un vecchio saggio seduto su una panchina di pietra.'), // distrattore
  ];
}

describe('tokenize', () => {
  it('estrae solo lettere (\\p{L}+) e lowercase', () => {
    expect(tokenize('Acqua, volare! 123 test.')).toEqual(['acqua', 'volare', 'test']);
  });

  it('gestisce accenti e grafemi italiani', () => {
    expect(tokenize('Il caffè era più caldo')).toEqual(['caffè', 'caldo']);
  });

  it('rimuove le stopword italiane', () => {
    const t = tokenize('il gatto e la volpe sono amici ma non sempre');
    expect(t).not.toContain('il');
    expect(t).not.toContain('la');
    expect(t).not.toContain('e');
    expect(t).not.toContain('ma');
    expect(t).not.toContain('non');
  });

  it('stringa vuota / solo stopword → []', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('il lo la di a da')).toEqual([]);
  });
});

describe('detectSigns', () => {
  it('fixture: acqua (x4) e volare (x3) sono i top-2 sign', () => {
    const signs = detectSigns(fixture());
    expect(signs.length).toBeGreaterThan(0);
    expect(signs[0]).toEqual({ label: 'acqua', count: 4 });
    expect(signs[1]).toEqual({ label: 'volare', count: 3 });
  });

  it('default threshold = 3: segni con count < 3 esclusi', () => {
    const signs = detectSigns(fixture());
    for (const s of signs) expect(s.count).toBeGreaterThanOrEqual(3);
  });

  it('rispetta threshold personalizzato', () => {
    const signs = detectSigns(fixture(), { threshold: 1 });
    // con soglia 1, tanti più segni
    expect(signs.length).toBeGreaterThan(2);
    expect(signs.at(0)?.count).toBe(4); // acqua ancora prima
  });

  it('rispetta top personalizzato', () => {
    const signs = detectSigns(fixture(), { top: 1 });
    expect(signs).toHaveLength(1);
    expect(signs.at(0)?.label).toBe('acqua');
  });

  it('ordina per count desc, tie-break alfabetico (deterministico)', () => {
    // costruisci sogni dove due parole hanno stesso count
    const dreams: Dream[] = [
      createDream({
        body: 'beta beta beta alfa alfa alfa',
        emotion: 'gioia',
        lucidity: 0,
      }),
    ];
    const signs = detectSigns(dreams, { threshold: 3 });
    // stesso count (3): alfa prima di beta alfabeticamente
    expect(signs.map((s) => s.label)).toEqual(['alfa', 'beta']);
  });

  it('esclude i sogni soft-deleted dal conteggio', () => {
    const dreams = fixture();
    // soft-delete il sogno[3] (1 acqua + 1 volare)
    const target = dreams[3];
    if (!target) throw new Error('fixture missing index 3');
    dreams[3] = { ...target, deletedAt: '2025-06-02T00:00:00.000Z' };
    const signs = detectSigns(dreams);
    // acqua: 4 → 3 (ancora >= soglia 3 → presente)
    const acqua = signs.find((s) => s.label === 'acqua');
    expect(acqua?.count).toBe(3);
    // volare: 3 → 2 (sotto soglia 3 → escluso)
    const volare = signs.find((s) => s.label === 'volare');
    expect(volare).toBeUndefined();
  });

  it('lista vuota → []', () => {
    expect(detectSigns([])).toEqual([]);
  });

  it('nessun segno sopra soglia → []', () => {
    const dreams: Dream[] = [
      createDream({ body: 'parola una due tre', emotion: 'calma', lucidity: 0 }),
    ];
    expect(detectSigns(dreams)).toEqual([]);
  });
});

describe('STOPWORDS_IT', () => {
  it('è un Set non vuoto con le parole chiave', () => {
    expect(STOPWORDS_IT.size).toBeGreaterThan(100);
    for (const w of ['il', 'la', 'di', 'che', 'essere', 'non']) {
      expect(STOPWORDS_IT.has(w)).toBe(true);
    }
  });

  it('NON contiene nomi sostanza come stopword', () => {
    // i nostri sign-target non devono essere stopword
    expect(STOPWORDS_IT.has('acqua')).toBe(false);
    expect(STOPWORDS_IT.has('volare')).toBe(false);
    expect(STOPWORDS_IT.has('mare')).toBe(false);
  });
});
