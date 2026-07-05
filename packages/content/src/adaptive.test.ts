/**
 * Test della logica adattiva (§S3-5 DoD: 3 casi).
 *
 *  1. Score alto → nessun inserimento.
 *  2. Score basso al giorno 7 → inserisce recall-01 (7.5).
 *  3. Doppio inserimento: dopo 2 extra, nessun nuovo inserimento (max).
 */
import { describe, it, expect } from 'vitest';
import {
  shouldInsertRecallExtra,
  ADAPTIVE_ENABLED,
  RECALL_SCORE_THRESHOLD,
} from './adaptive.js';

describe('shouldInsertRecallExtra — §S3-5', () => {
  it('ADAPTIVE_ENABLED è false di default (Step 6 non ancora built)', () => {
    expect(ADAPTIVE_ENABLED).toBe(false);
  });

  it('RECALL_SCORE_THRESHOLD è 40', () => {
    expect(RECALL_SCORE_THRESHOLD).toBe(40);
  });

  it('CASO 1 — score alto (≥ 40) al giorno 7: nessun inserimento', () => {
    const d = shouldInsertRecallExtra({ completedDay: 7, recallScore: 70, existingExtras: 0 });
    expect(d.insert).toBe(false);
    expect(d.lessonDay).toBeNull();
  });

  it('CASO 1b — score esattamente a soglia (40): nessun inserimento (≥ soglia)', () => {
    const d = shouldInsertRecallExtra({ completedDay: 7, recallScore: 40, existingExtras: 0 });
    expect(d.insert).toBe(false);
  });

  it('CASO 2 — score basso (< 40) al giorno 7: inserisce recall-01 (7.5)', () => {
    const d = shouldInsertRecallExtra({ completedDay: 7, recallScore: 25, existingExtras: 0 });
    expect(d.insert).toBe(true);
    expect(d.lessonDay).toBe(7.5);
  });

  it('CASO 2b — score basso al giorno 14: inserisce recall-02 (14.5)', () => {
    const d = shouldInsertRecallExtra({ completedDay: 14, recallScore: 30, existingExtras: 1 });
    expect(d.insert).toBe(true);
    expect(d.lessonDay).toBe(14.5);
  });

  it('CASO 3 — doppio inserimento max: existingExtras=2 → mai nuovo insert', () => {
    // anche con score basso al giorno 7
    const d7 = shouldInsertRecallExtra({ completedDay: 7, recallScore: 10, existingExtras: 2 });
    expect(d7.insert).toBe(false);
    expect(d7.lessonDay).toBeNull();
    // e al giorno 14
    const d14 = shouldInsertRecallExtra({ completedDay: 14, recallScore: 10, existingExtras: 2 });
    expect(d14.insert).toBe(false);
  });

  it('giorni diversi da 7 e 14: mai inserimento', () => {
    for (const day of [1, 6, 8, 13, 15, 21]) {
      const d = shouldInsertRecallExtra({ completedDay: day, recallScore: 5, existingExtras: 0 });
      expect(d.insert).toBe(false);
    }
  });

  it('existingExtras=1 al giorno 7: inserisce comunque (sotto il max)', () => {
    const d = shouldInsertRecallExtra({ completedDay: 7, recallScore: 20, existingExtras: 1 });
    expect(d.insert).toBe(true);
    expect(d.lessonDay).toBe(7.5);
  });

  it('score 0 (minimo) al giorno 7: inserisce', () => {
    const d = shouldInsertRecallExtra({ completedDay: 7, recallScore: 0, existingExtras: 0 });
    expect(d.insert).toBe(true);
  });

  it('score negativo trattato come sotto soglia (inserisce)', () => {
    const d = shouldInsertRecallExtra({ completedDay: 7, recallScore: -5, existingExtras: 0 });
    expect(d.insert).toBe(true);
  });
});
