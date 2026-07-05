import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { toStaticSVG } from './svg.js';
import { gardenLayout } from './layout.js';
import type { GardenNode } from './layout.js';
import type { OrganismParams, Emotion, Lucidity } from './types.js';

const fixturesDir = resolve(
  decodeURIComponent(new URL('.', import.meta.url).pathname),
  '..',
  'fixtures',
);

/** Accessor che restituisce l'i-esimo elemento o lancia (evita `!` e `T | undefined`). */
function nth<T>(arr: readonly T[], i: number): T {
  const v = arr[i];
  if (v === undefined) throw new Error(`index ${i} out of bounds (${arr.length})`);
  return v;
}

/** I 5 input fissi — devONO restare identici (sono il contratto dello snapshot). */
const FIXTURE_INPUTS: { id: string; p: OrganismParams }[] = [
  { id: 'biblioteca', p: { seed: 'La biblioteca sommersa', emotion: 'meraviglia', lucidity: 2 } },
  { id: 'volo', p: { seed: 'Volo basso sul grano', emotion: 'gioia', lucidity: 3 } },
  { id: 'treno', p: { seed: 'Il treno senza fermate', emotion: 'malinconia', lucidity: 0 } },
  { id: 'casa', p: { seed: 'La casa che respira', emotion: 'paura', lucidity: 1 } },
  { id: 'marea', p: { seed: 'Marea in salotto', emotion: 'calma', lucidity: 1 } },
];

describe('toStaticSVG — snapshot contro fixture committed', () => {
  for (const { id, p } of FIXTURE_INPUTS) {
    it(`fixture "${id}" è byte-identica al committed`, () => {
      const svg = toStaticSVG(p, 128);
      const expected = readFileSync(resolve(fixturesDir, `${id}.svg`), 'utf8');
      expect(svg).toBe(expected);
    });
  }

  it('è deterministico: stesso input → stesso SVG (altri 2 seed)', () => {
    const p: OrganismParams = { seed: 'Corridoio di specchi', emotion: 'desiderio', lucidity: 0 };
    expect(toStaticSVG(p, 96)).toBe(toStaticSVG(p, 96));
  });

  it('size diversa → SVG diverso (la size è rispettata)', () => {
    const p: OrganismParams = { seed: 'x', emotion: 'calma', lucidity: 2 };
    const a = toStaticSVG(p, 64);
    const b = toStaticSVG(p, 128);
    expect(a).not.toBe(b);
    expect(a).toContain('viewBox="0 0 64 64"');
    expect(b).toContain('viewBox="0 0 128 128"');
  });

  it('lucidity influisce su glow e petali (output diverso)', () => {
    const base = (lucidity: Lucidity): string =>
      toStaticSVG({ seed: 'seed-stesso', emotion: 'gioia', lucidity }, 100);
    expect(base(0)).not.toBe(base(3));
  });

  it('emotion diversa → hue diverso nel fill', () => {
    const calm = toStaticSVG({ seed: 's', emotion: 'calma', lucidity: 1 }, 100);
    const joy = toStaticSVG({ seed: 's', emotion: 'gioia', lucidity: 1 }, 100);
    expect(calm).not.toBe(joy);
    // hue calma = 172
    expect(calm).toContain('172');
    // hue gioia = 36
    expect(joy).toContain('36');
  });

  it('SVG è ben formato (xmlns + viewBox + chiusura)', () => {
    const svg = toStaticSVG({ seed: 's', emotion: 'calma', lucidity: 1 }, 64);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0 64 64"');
  });
});

describe('gardenLayout — determinismo e formula del prototipo', () => {
  const seeds: GardenNode[] = [
    { seed: 'a', lucidity: 2, bodyLen: 220 },
    { seed: 'b', lucidity: 0, bodyLen: 50 },
    { seed: 'c', lucidity: 3, bodyLen: 100 },
    { seed: 'd', lucidity: 1, bodyLen: 10 },
    { seed: 'e', lucidity: 1, bodyLen: 30 },
    { seed: 'f', lucidity: 2, bodyLen: 80 },
  ];

  it('stessa lista → stesso layout (due chiamate indipendenti)', () => {
    const a = gardenLayout(seeds, 360, 600);
    const b = gardenLayout(seeds, 360, 600);
    expect(a).toEqual(b);
  });

  it('restituisce un array parallelo (stessa lunghezza)', () => {
    const pos = gardenLayout(seeds, 360, 600);
    expect(pos).toHaveLength(seeds.length);
  });

  it('colonne: i primi 3 nodi hanno x in colonna 0/1/2 (x cresce)', () => {
    const pos = gardenLayout(seeds, 360, 600);
    // col0 ≈ 60, col1 ≈ 180, col2 ≈ 300 (con jitter ±17)
    expect(nth(pos, 0).x).toBeLessThan(nth(pos, 1).x);
    expect(nth(pos, 1).x).toBeLessThan(nth(pos, 2).x);
  });

  it('riga 1 (idx 3..5) ha y maggiore della riga 0', () => {
    const pos = gardenLayout(seeds, 360, 600);
    expect(nth(pos, 3).y).toBeGreaterThan(nth(pos, 0).y);
  });

  it('size segue la formula 26 + luc*7 + min(bodyLen,220)*.03', () => {
    const pos = gardenLayout(seeds, 360, 600);
    // idx 1: luc=0, bodyLen=50 → 26 + 0 + 50*.03 = 27.5
    expect(nth(pos, 1).size).toBeCloseTo(27.5, 5);
    // idx 0: luc=2, bodyLen=220 → 26 + 14 + 220*.03 = 46.6
    expect(nth(pos, 0).size).toBeCloseTo(46.6, 5);
  });

  it('lista diversa → layout diverso', () => {
    const a = gardenLayout(seeds, 360, 600);
    const reordered = [...seeds].reverse();
    const b = gardenLayout(reordered, 360, 600);
    expect(nth(a, 0)).not.toEqual(nth(b, 0));
  });

  it('dimensioni canvas diverse → posizioni scalate', () => {
    const small = gardenLayout(seeds, 360, 600);
    const big = gardenLayout(seeds, 720, 1200);
    // x raddoppia ~ (griglia × w)
    expect(nth(big, 0).x).toBeGreaterThan(nth(small, 0).x);
  });

  it('è stabile su 1000 nodi (no overflow, valori finiti)', () => {
    const many: GardenNode[] = Array.from({ length: 1000 }, (_, i) => ({
      seed: String(i),
      lucidity: (i % 4) as Lucidity,
      bodyLen: i,
    }));
    const pos = gardenLayout(many, 360, 600);
    expect(pos).toHaveLength(1000);
    for (const p of pos) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(Number.isFinite(p.size)).toBe(true);
    }
  });
});

describe('toStaticSVG — copre tutte le emozioni/lucidity', () => {
  const emotions: Emotion[] = [
    'calma',
    'meraviglia',
    'gioia',
    'paura',
    'malinconia',
    'desiderio',
  ];
  for (const emotion of emotions) {
    for (const lucidity of [0, 1, 2, 3] as Lucidity[]) {
      it(`${emotion}/luc${lucidity} produce SVG non vuoto`, () => {
        const svg = toStaticSVG({ seed: 'k', emotion, lucidity }, 64);
        expect(svg.length).toBeGreaterThan(200);
        expect(svg.endsWith('</svg>')).toBe(true);
      });
    }
  }
});
