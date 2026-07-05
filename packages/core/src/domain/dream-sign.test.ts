import { describe, expect, it } from 'vitest';
import { normalizeSignLabel } from './dream-sign.js';

describe('normalizeSignLabel', () => {
  it('lowercase + trim', () => {
    expect(normalizeSignLabel('  Acqua ')).toBe('acqua');
    expect(normalizeSignLabel('VOLARE')).toBe('volare');
  });

  it('collassa spazi multipli (e tab/newline) in uno', () => {
    expect(normalizeSignLabel('Volo   a\tvela')).toBe('volo a vela');
    expect(normalizeSignLabel('a   b\n c')).toBe('a b c');
  });

  it('gestisce stringa vuota / solo spazi', () => {
    expect(normalizeSignLabel('')).toBe('');
    expect(normalizeSignLabel('    ')).toBe('');
  });

  it('mantiene gli accenti italiani', () => {
    expect(normalizeSignLabel('Caffè')).toBe('caffè');
    expect(normalizeSignLabel('  Pèsca ')).toBe('pèsca');
  });

  it('idempotente', () => {
    const once = normalizeSignLabel(' Acqua  Vela ');
    expect(normalizeSignLabel(once)).toBe(once);
  });
});
