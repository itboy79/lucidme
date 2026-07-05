import { describe, expect, it } from 'vitest';
import { hashStr, seedHex } from './hash.js';

describe('hashStr (FNV-1a 32-bit)', () => {
  it('restituisce unsigned 32-bit interi stabili', () => {
    expect(hashStr('')).toBe(0x811c9dc5); // offset basis per stringa vuota
    expect(Number.isInteger(hashStr('ciao'))).toBe(true);
    expect(hashStr('ciao')).toBe(hashStr('ciao')); // deterministico
  });

  it('dispersione: input diversi → hash diversi (naive)', () => {
    expect(hashStr('a')).not.toBe(hashStr('b'));
    expect(hashStr('acqua')).not.toBe(hashStr('volare'));
  });

  it('è sempre >= 0 (unsigned)', () => {
    // input che storicamente producevano bit alti
    for (const s of ['zzzz', 'ÆÆÆ', '🔥', 'acqua volare sogno']) {
      expect(hashStr(s)).toBeGreaterThanOrEqual(0);
    }
  });

  it('distingue stringhe che differiscono solo per case/ordine', () => {
    expect(hashStr('ab')).not.toBe(hashStr('ba'));
  });
});

describe('seedHex', () => {
  it('restituisce hex 8 cifre, deterministico', () => {
    const a = seedHex('01HWTEST0001', '2025-01-01T00:00:00.000Z');
    expect(a).toMatch(/^[0-9a-f]{8}$/);
    expect(a).toBe(seedHex('01HWTEST0001', '2025-01-01T00:00:00.000Z'));
  });

  it('padStart a 8 cifre con zeri iniziali', () => {
    // forziamo un hash basso scegliendo id che produce valore piccolo:
    // qualunque sia, deve restare lungo 8
    const s = seedHex('x', '2025-01-01T00:00:00.000Z');
    expect(s.length).toBe(8);
  });

  it('cambia se cambia id o createdAt', () => {
    const base = seedHex('idA', '2025-01-01T00:00:00.000Z');
    expect(seedHex('idB', '2025-01-01T00:00:00.000Z')).not.toBe(base);
    expect(seedHex('idA', '2025-01-02T00:00:00.000Z')).not.toBe(base);
  });

  it('coincide con hashStr(id+createdAt) in hex', () => {
    const id = '01HWTEST0099';
    const created = '2025-06-07T08:09:10.111Z';
    expect(seedHex(id, created)).toBe(hashStr(id + created).toString(16).padStart(8, '0'));
  });
});
