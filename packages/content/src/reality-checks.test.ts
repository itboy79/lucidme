/**
 * Test dei prompt pool dei reality check (§S5-1 DoD).
 *
 * Validazione: 60 prompt, 15 per categoria, max 90 char, nessun punto
 * esclamativo, zero duplicati, schema corretto.
 */
import { describe, it, expect } from 'vitest';
import prompts from '../reality-checks/prompts.json' with { type: 'json' };

type Category = 'mani' | 'testo' | 'domanda' | 'ambiente';
interface Prompt {
  id: string;
  text: string;
  category: Category;
}

const data = prompts as Prompt[];

describe('reality-check prompts — §S5-1', () => {
  it('ci sono 60 prompt totali', () => {
    expect(data.length).toBe(60);
  });

  it('15 per categoria', () => {
    const byCat = (c: Category) => data.filter((p) => p.category === c).length;
    expect(byCat('mani')).toBe(15);
    expect(byCat('testo')).toBe(15);
    expect(byCat('domanda')).toBe(15);
    expect(byCat('ambiente')).toBe(15);
  });

  it('ogni prompt ha id, text, category validi', () => {
    const validCats = new Set(['mani', 'testo', 'domanda', 'ambiente']);
    for (const p of data) {
      expect(typeof p.id).toBe('string');
      expect(p.id.length).toBeGreaterThan(0);
      expect(typeof p.text).toBe('string');
      expect(p.text.length).toBeGreaterThan(0);
      expect(validCats.has(p.category)).toBe(true);
    }
  });

  it('max 90 caratteri per text', () => {
    for (const p of data) {
      expect(p.text.length).toBeLessThanOrEqual(90);
    }
  });

  it('nessun punto esclamativo (tono calmo interrogativo)', () => {
    for (const p of data) {
      expect(p.text).not.toMatch(/!/);
    }
  });

  it('zero duplicati (id e text univoci)', () => {
    const ids = new Set(data.map((p) => p.id));
    const texts = new Set(data.map((p) => p.text));
    expect(ids.size).toBe(data.length);
    expect(texts.size).toBe(data.length);
  });
});
