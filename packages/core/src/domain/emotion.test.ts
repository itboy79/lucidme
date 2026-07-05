import { describe, expect, it } from 'vitest';
import { EMOTIONS, isEmotion } from './emotion.js';

describe('EMOTIONS', () => {
  it('contiene le 6 emozioni v1 nell\'ordine del selettore', () => {
    expect(EMOTIONS).toEqual([
      'calma',
      'meraviglia',
      'gioia',
      'paura',
      'malinconia',
      'desiderio',
    ]);
  });

  it('è readonly (as const)', () => {
    // type-level: ogni elemento è string literal. Runtime: array di 6.
    expect(EMOTIONS.length).toBe(6);
  });
});

describe('isEmotion', () => {
  it('true per emozioni valide', () => {
    expect(isEmotion('calma')).toBe(true);
    expect(isEmotion('desiderio')).toBe(true);
  });

  it('false per valori non validi o tipi sbagliati', () => {
    expect(isEmotion('ronfante')).toBe(false);
    expect(isEmotion('')).toBe(false);
    expect(isEmotion(undefined)).toBe(false);
    expect(isEmotion(null)).toBe(false);
    expect(isEmotion(123)).toBe(false);
    expect(isEmotion({})).toBe(false);
  });

  it('è case-sensitive (calma ≠ Calma)', () => {
    expect(isEmotion('Calma')).toBe(false);
  });
});
