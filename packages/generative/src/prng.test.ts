import { describe, expect, it } from 'vitest';
import { mulberry32, hashStr } from './prng.js';
import { EMOTIONS, EMOTION_HUES } from './types.js';

describe('mulberry32 — determinismo', () => {
  it('stesso seed → stessi primi 100 numeri (due stream indipendenti)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 100 }, () => a());
    const seqB = Array.from({ length: 100 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('seed diverso → sequenza diversa', () => {
    const a = Array.from({ length: 20 }, () => mulberry32(42)());
    const b = Array.from({ length: 20 }, () => mulberry32(43)());
    expect(a).not.toEqual(b);
  });

  it('tutti gli output sono in [0, 1)', () => {
    const rnd = mulberry32(123456);
    for (let i = 0; i < 1000; i++) {
      const v = rnd();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('valori noti del prototipo (seed 42, primi 3)', () => {
    // Calcolati una volta con la reference del prototipo; locking per regression.
    const rnd = mulberry32(42);
    const first3 = [rnd(), rnd(), rnd()];
    expect(first3).toMatchSnapshot();
  });
});

describe('hashStr — FNV-1a 32-bit', () => {
  it('è deterministico (stesso input → stesso output)', () => {
    expect(hashStr('La biblioteca sommersa')).toBe(hashStr('La biblioteca sommersa'));
  });

  it('input diversi → output diversi (buona dispersione)', () => {
    expect(hashStr('alpha')).not.toBe(hashStr('beta'));
    expect(hashStr('a')).not.toBe(hashStr('b'));
  });

  it('restituisce unsigned 32-bit (>= 0, < 2^32)', () => {
    for (const s of ['', 'a', 'ab', 'seed-123', 'La biblioteca sommersa']) {
      const h = hashStr(s);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(0x100000000);
    }
  });

  it('valori noti (locking byte del prototipo)', () => {
    // Il prototipo usa FNV-1a con offset 2166136261 e prime 16777619.
    // Stringa vuota → offset basis invariato (= 2166136261 = 0x811c9dc5).
    expect(hashStr('')).toBe(0x811c9dc5);
  });

  it('è coerente con @lucidme/core (stesso algoritmo FNV-1a, locking byte)', () => {
    // Non importiamo core qui: il motore deve restare zero-deps anche a livello
    // di type-check. Verifichiamo invece i valori noti di FNV-1a che BOTH core
    // e questo modulo devono produrre (offset basis 2166136261, prime 16777619).
    // Core usa lo stesso algoritmo (vedi packages/core/src/crypto/hash.ts).
    // Se uno dei due cambia algoritmo, questo test NON rompe — ma il test
    // parallelo in core sì. Il contratto è: hashStr('') === 0x811c9dc5 ovunque.
    expect(hashStr('')).toBe(0x811c9dc5);
    // 'a' = 0x61; FNV-1a step: h = (0x811c9dc5 ^ 0x61) * 16777619 (mod 2^32)
    const expectedA =
      (Math.imul(0x811c9dc5 ^ 0x61, 16777619) >>> 0);
    expect(hashStr('a')).toBe(expectedA);
  });
});

describe('EMOTIONS / EMOTION_HUES — allineamento prototipo', () => {
  it('6 emozioni nell’ordine del selettore Alba', () => {
    expect(EMOTIONS).toEqual([
      'calma',
      'meraviglia',
      'gioia',
      'paura',
      'malinconia',
      'desiderio',
    ]);
  });

  it('hue copiati dall’array EMOS del prototipo', () => {
    expect(EMOTION_HUES).toEqual({
      calma: 172,
      meraviglia: 262,
      gioia: 36,
      paura: 295,
      malinconia: 215,
      desiderio: 330,
    });
  });
});
