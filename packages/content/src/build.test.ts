/**
 * Test del build del Sentiero (§S3-1 DoD).
 *
 * Verifica che:
 *  - tutte le 23 lezioni (21 + 2 extra) carichino senza errori;
 *  - tutti i `ref` citati siano validi rispetto a `99-fonti.md`;
 *  - nessun body sia vuoto;
 *  - i giorni 1..21 siano sequenziali e senza buchi;
 *  - il build FALLISCA se un ref è inventato (regola bloccante del ticket).
 *
 * I test leggono i veri file markdown da `../lessons/` e il vero `99-fonti.md`
 * dalla wiki, usando node:fs (vitest gira in node). Così validano il prodotto
 * reale, non fixture.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBundle } from './build.js';
import { getLesson, getAllLessons, getExtras, loadBundle, getPhases } from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
const lessonsDir = join(here, '..', 'lessons');
const extraDir = join(lessonsDir, 'extra');
// Copia vendorizzata nel repo (stessa che usa scripts/build.mjs): il test
// gira anche su CI/clone dove la wiki-os sibling non esiste.
const wikiPath = join(here, '..', 'wiki', '99-fonti.md');

function readMdFiles(dir: string): { name: string; content: string }[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .sort()
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ name: f, content: readFileSync(join(dir, f), 'utf8') }));
}

const inputs = [...readMdFiles(lessonsDir), ...readMdFiles(extraDir)];
const wikiMd = readFileSync(wikiPath, 'utf8');

describe('Sentiero build — completo', () => {
  it('legge 23 file (21 lezioni + 2 extra)', () => {
    expect(inputs.length).toBe(23);
  });

  it('builda senza errori e produce 21 lezioni + 2 extra', () => {
    const result = buildBundle(inputs, wikiMd);
    expect(result.lessons.length).toBe(21);
    expect(result.extras.length).toBe(2);
  });

  it('i giorni 1..21 sono sequenziali e senza buchi', () => {
    const result = buildBundle(inputs, wikiMd);
    const days = result.lessons.map((l) => l.day);
    expect(days).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
  });

  it('gli extra sono ai giorni 7.5 e 14.5', () => {
    const result = buildBundle(inputs, wikiMd);
    const extraDays = result.extras.map((l) => l.day).sort((a, b) => a - b);
    expect(extraDays).toEqual([7.5, 14.5]);
  });

  it('nessun body vuoto e tutti ≥ 80 parole', () => {
    const result = buildBundle(inputs, wikiMd);
    for (const l of [...result.lessons, ...result.extras]) {
      expect(l.body.trim().length).toBeGreaterThan(0);
      const words = l.body.split(/\s+/).filter(Boolean).length;
      // ogni lezione è sostanziosa (DoD qualitativo del ticket: 150-300 parole).
      expect(words).toBeGreaterThanOrEqual(80);
    }
  });

  it('tutti i ref citati sono validi in 99-fonti.md', () => {
    const result = buildBundle(inputs, wikiMd);
    for (const l of [...result.lessons, ...result.extras]) {
      for (const s of l.sources) {
        expect(s.ref).toMatch(/^[a-z0-9][a-z0-9-]*$/); // formato chiave stabile
        // il build avrebbe già lanciato se invalido; qui ribadiamo l'invariante.
        expect(s.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('le fasi ≠ fondamenta hanno almeno una fonte (regola ticket)', () => {
    const result = buildBundle(inputs, wikiMd);
    for (const l of result.lessons) {
      if (l.phase !== 'fondamenti') {
        expect(l.sources.length).toBeGreaterThan(0);
      }
    }
  });

  it('FAILisce se una lezione cita un ref inesistente (regola bloccante)', () => {
    const bad = inputs.map((i) =>
      i.name === '04-reality-check-mani.md'
        ? {
            name: i.name,
            content: i.content.replace('saunders-2016', 'fonte-inesistente-xyz'),
          }
        : i,
    );
    expect(() => buildBundle(bad, wikiMd)).toThrow(/fonte-inesistente-xyz.*non presente in 99-fonti.md/s);
  });

  it('FAILisce se manca una lezione (giorno 15 assente)', () => {
    const missing = inputs.filter((i) => !i.name.startsWith('15-'));
    expect(() => buildBundle(missing, wikiMd)).toThrow(/giorno 15/i);
  });
});

describe('API pubblica (index.ts)', () => {
  it('getLesson(1) ritorna la lezione del giorno 1', () => {
    const l = getLesson(1);
    expect(l).not.toBeNull();
    expect(l?.day).toBe(1);
    expect(l?.title.length).toBeGreaterThan(0);
  });

  it('getLesson(99) ritorna null (fuori range)', () => {
    expect(getLesson(99)).toBeNull();
  });

  it('getLesson(7.5) ritorna il primo extra', () => {
    const l = getLesson(7.5);
    expect(l).not.toBeNull();
    expect(l?.title.toLowerCase()).toContain('ricordo');
  });

  it('getAllLessons ritorna 21 lezioni ordinate', () => {
    const all = getAllLessons();
    expect(all.length).toBe(21);
    expect(all[0]?.day).toBe(1);
    expect(all[20]?.day).toBe(21);
  });

  it('getExtras ritorna 2 extra', () => {
    expect(getExtras().length).toBe(2);
  });

  it('loadBundle ritorna 23 voci ordinate (lesson + extra intercalati)', () => {
    const all = loadBundle();
    expect(all.length).toBe(23);
    // l'extra 7.5 sta tra 7 e 8
    const idx7 = all.findIndex((l) => l.day === 7);
    const idx75 = all.findIndex((l) => l.day === 7.5);
    const idx8 = all.findIndex((l) => l.day === 8);
    expect(idx7).toBeLessThan(idx75);
    expect(idx75).toBeLessThan(idx8);
  });

  it('getPhases ritorna 4 fasi con range corretti', () => {
    const phases = getPhases();
    expect(phases.length).toBe(4);
    expect(phases[0]).toEqual({ phase: 'fondamenti', dayRange: [1, 3] });
    expect(phases[3]).toEqual({ phase: 'tlr', dayRange: [17, 21] });
  });

  it('le lezioni restituite sono copie difese (mutarle non sporca il bundle)', () => {
    const l = getLesson(1);
    if (!l) throw new Error('lezione mancante');
    l.title = 'manomesso';
    const l2 = getLesson(1);
    expect(l2?.title).not.toBe('manomesso');
  });
});
