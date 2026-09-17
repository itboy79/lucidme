import { describe, expect, it } from 'vitest';
import {
  can,
  FEATURE_MATRIX,
  RC_DAILY_LIMIT,
  type Feature,
  type Tier,
} from './entitlements.js';

// Matrice attesa hard-coded: il test è indipendente dall'implementazione.
// Se qualcuno cambia la matrice, questo test fallisce (intenzionale).
const EXPECTED_MATRIX: Readonly<Record<Feature, Readonly<Record<Tier, boolean>>>> = {
  journal: { free: true, pro: true },
  export: { free: true, pro: true },
  path_full: { free: false, pro: true },
  trend_long: { free: false, pro: true },
  custom_sounds: { free: false, pro: true },
  sync_multi: { free: false, pro: true },
  e2e: { free: true, pro: true },
};

const FEATURES = Object.keys(EXPECTED_MATRIX) as Feature[];
const TIERS: readonly Tier[] = ['free', 'pro'];

describe('can — matrice entitlement completa (ticket S8-1)', () => {
  // 7 feature × 2 tier = 14 assert esaustivi.
  it.each(FEATURES.flatMap((feature) =>
    TIERS.map((tier) => ({ feature, tier, expected: EXPECTED_MATRIX[feature][tier] })),
  ))('can($feature, $tier) = $expected', ({ feature, tier, expected }) => {
    expect(can(feature, tier)).toBe(expected);
  });

  it('FEATURE_MATRIX coincide con la specifica S8-1', () => {
    expect(FEATURE_MATRIX).toEqual(EXPECTED_MATRIX);
  });
});

describe('privacy mai a pagamento (invarianti di prodotto)', () => {
  it('e2e è true su OGNI tier', () => {
    for (const tier of TIERS) {
      expect(can('e2e', tier)).toBe(true);
    }
  });

  it('export è true su OGNI tier', () => {
    for (const tier of TIERS) {
      expect(can('export', tier)).toBe(true);
    }
  });
});

describe('RC_DAILY_LIMIT', () => {
  it('free = 4, pro = 8', () => {
    expect(RC_DAILY_LIMIT.free).toBe(4);
    expect(RC_DAILY_LIMIT.pro).toBe(8);
  });

  it('definisce esattamente i due tier', () => {
    expect(Object.keys(RC_DAILY_LIMIT).sort()).toEqual(['free', 'pro']);
  });
});

describe('purezza del modulo', () => {
  it('non esporta side-effect: namespace = sole 3 esportazioni runtime', async () => {
    const ns = await import('./entitlements.js');
    expect(Object.keys(ns).sort()).toEqual(['FEATURE_MATRIX', 'RC_DAILY_LIMIT', 'can']);
  });

  it('can è privo di stato: ripetere le chiamate non muta la matrice', () => {
    const snapshot = JSON.parse(JSON.stringify(FEATURE_MATRIX)) as typeof FEATURE_MATRIX;
    for (const feature of FEATURES) {
      for (const tier of TIERS) {
        can(feature, tier);
        can(feature, tier);
      }
    }
    expect(FEATURE_MATRIX).toEqual(snapshot);
  });
});
