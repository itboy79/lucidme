/**
 * Test del RC scheduler (§S5-2 DoD).
 *
 * Hard DoD (from ticket):
 *  - 1000 giorni simulati → distribuzione uniforme sugli slot (chi-square,
 *    p > 0.01);
 *  - distanza minima 75 min sempre rispettata;
 *  - nessun prompt ripetuto in-day;
 *  - nessuna stessa categoria due volte di fila;
 *  - stesso seed → stesso piano (idempotente).
 */
import { describe, it, expect } from 'vitest';
import {
  planDay,
  daySeed,
  RC_DEFAULTS,
  RC_MIN_DISTANCE_MIN,
} from './scheduler.js';
import { getPromptById } from './prompt-pool.js';

/**
 * Chi-square goodness-of-fit test (no deps). Restituisce p-value approssimato
 * via sopravvivenza della chi-square con `k-1` gradi di libertà.
 *
 * Usiamo la distribuzione asintotica: p = P(X > chi2) per X ~ chi-square(df).
 * Calcoliamo la sopravvivenza via la serie di Wilson–Hilferty (approssimazione
 * normale) — sufficiente per un test di uniformità con 1000 campioni.
 */
function chiSquarePValue(observed: number[], expected: number): number {
  const df = observed.length - 1;
  let chi = 0;
  for (const o of observed) {
    chi += ((o - expected) ** 2) / expected;
  }
  // Wilson–Hilferty: chi2 ≈ df * (1 - 2/(9df) + z*sqrt(2/(9df)))^3
  // Invertiamo per ottenere z da chi, poi p = 1 - Phi(z) a due code → qui usiamo
  // la sopravvivenza diretta della chi-square via lower incomplete gamma series.
  return chiSquareSurvival(chi, df);
}

/** Sopravvivenza P(X > x) per X ~ chi-square(df), via lower incomplete gamma. */
function chiSquareSurvival(x: number, df: number): number {
  // P(X > x) = 1 - P(df/2, x/2) dove P è la lower regularized incomplete gamma.
  return 1 - lowerIncompleteGamma(df / 2, x / 2);
}

/**
 * Lower regularized incomplete gamma P(a, x) via series + continued fraction.
 * (Numerical Recipes, §6.2). Accurata per i nostri scopi.
 */
function lowerIncompleteGamma(a: number, x: number): number {
  if (x < 0 || a <= 0) return 0;
  if (x < a + 1) {
    // series expansion
    let term = 1 / a;
    let sum = term;
    for (let n = 1; n < 200; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  // continued fraction → Q, poi 1-Q
  return 1 - upperIncompleteGamma(a, x);
}

function upperIncompleteGamma(a: number, x: number): number {
  // Lentz's algorithm for the continued fraction
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/** Log-gamma via Lanczos approximation. */
function logGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = c[0] as number;
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) {
    a += (c[i] as number) / (x + i);
  }
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

describe('RC scheduler — §S5-2', () => {
  it('stesso seed → stesso piano (idempotente)', () => {
    const seed = daySeed('local', '20250705');
    const a = planDay(RC_DEFAULTS, seed, 0);
    const b = planDay(RC_DEFAULTS, seed, 0);
    expect(a.minutes).toEqual(b.minutes);
    expect(a.promptIds).toEqual(b.promptIds);
  });

  it('count rispettato (4 check di default)', () => {
    const seed = daySeed('local', '20250705');
    const plan = planDay(RC_DEFAULTS, seed, 0);
    expect(plan.minutes.length).toBe(4);
    expect(plan.promptIds.length).toBe(4);
  });

  it('distanza minima 75 min sempre rispettata (1000 giorni)', () => {
    for (let d = 1; d <= 1000; d++) {
      const dateStr = String(d).padStart(8, '0'); // date fittizia YYYYMMDD
      const seed = daySeed('local', dateStr);
      const plan = planDay(RC_DEFAULTS, seed, d % 60);
      const sorted = [...plan.minutes].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        const dist = (sorted[i] ?? 0) - (sorted[i - 1] ?? 0);
        expect(dist).toBeGreaterThanOrEqual(RC_MIN_DISTANCE_MIN);
      }
    }
  });

  it('nessun prompt ripetuto in-day (1000 giorni)', () => {
    for (let d = 1; d <= 1000; d++) {
      const dateStr = String(d).padStart(8, '0');
      const seed = daySeed('local', dateStr);
      const plan = planDay(RC_DEFAULTS, seed, d % 60);
      const unique = new Set(plan.promptIds);
      expect(unique.size).toBe(plan.promptIds.length);
    }
  });

  it('nessuna stessa categoria due volte di fila (1000 giorni)', () => {
    for (let d = 1; d <= 1000; d++) {
      const dateStr = String(d).padStart(8, '0');
      const seed = daySeed('local', dateStr);
      const plan = planDay(RC_DEFAULTS, seed, d % 60);
      for (let i = 1; i < plan.promptIds.length; i++) {
        const prev = getPromptById(plan.promptIds[i - 1] ?? '');
        const curr = getPromptById(plan.promptIds[i] ?? '');
        expect(prev).toBeTruthy();
        expect(curr).toBeTruthy();
        if (prev && curr) {
          expect(curr.category).not.toBe(prev.category);
        }
      }
    }
  });

  it('distribuzione uniforme sugli slot (chi-square, p > 0.01, 1000 giorni)', () => {
    // Costruiamo gli stessi slot del planner (15-min in [540,1260]).
    const slots: number[] = [];
    for (let s = 540; s <= 1260; s += 15) slots.push(s);
    const slotIdx = new Map<number, number>();
    slots.forEach((s, i) => slotIdx.set(s, i));

    const observed = new Array(slots.length).fill(0) as number[];
    const totalChecks = 1000 * RC_DEFAULTS.count; // 4000 check
    const expected = totalChecks / slots.length;

    for (let d = 1; d <= 1000; d++) {
      const dateStr = String(d).padStart(8, '0');
      const seed = daySeed('local', dateStr);
      const plan = planDay(RC_DEFAULTS, seed, d % 60);
      for (const min of plan.minutes) {
        const idx = slotIdx.get(min);
        if (idx === undefined) {
          throw new Error(`slot ${min} non atteso (fuori range?)`);
        }
        observed[idx] = (observed[idx] ?? 0) + 1;
      }
    }

    const p = chiSquarePValue(observed, expected);
    // DoD hard: p > 0.01 (non possiamo rigettare l'ipotesi di uniformità).
    expect(p).toBeGreaterThan(0.01);
  });

  it('seed diverso (giorno diverso) → piano generalmente diverso', () => {
    const a = planDay(RC_DEFAULTS, daySeed('local', '20250705'), 0);
    const b = planDay(RC_DEFAULTS, daySeed('local', '20250706'), 0);
    // altamente improbabile che due giorni consecutivi diano lo stesso piano
    const sameMinutes =
      a.minutes.length === b.minutes.length &&
      a.minutes.every((m, i) => m === (b.minutes[i] ?? -1));
    expect(sameMinutes).toBe(false);
  });

  it('count clampato in [2,8]', () => {
    const seed = daySeed('local', '20250705');
    expect(planDay({ ...RC_DEFAULTS, count: 1 }, seed, 0).minutes.length).toBe(2);
    expect(planDay({ ...RC_DEFAULTS, count: 99 }, seed, 0).minutes.length).toBe(8);
  });
});
