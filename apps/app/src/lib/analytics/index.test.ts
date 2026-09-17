/**
 * Test analytics (S8-3): default OFF, persistenza opt-in, no-op senza chiave,
 * init-once + capture con chiave, resilienza storage.
 *
 * Il modulo legge lo stato al momento dell'import: ogni test re-importa il
 * modulo fresco (vi.resetModules) con la sua storage stub.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock di posthog-js: intercetta anche l'import dinamico nel modulo sotto test.
const initMock = vi.fn();
const captureMock = vi.fn();
vi.mock('posthog-js', () => ({
  default: {
    init: initMock,
    capture: captureMock,
  },
}));

/** Stub localStorage minimale (environment: node). */
class LocalStorageStub {
  private map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

/** Storage che lancia sempre (simula private mode restrittiva). */
class ThrowingStorage {
  getItem(): string | null {
    throw new Error('denied');
  }
  setItem(): void {
    throw new Error('denied');
  }
  removeItem(): void {
    throw new Error('denied');
  }
}

async function freshModule(): Promise<typeof import('./index.js')> {
  vi.resetModules();
  return import('./index.js');
}

describe('analytics (S8-3)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new LocalStorageStub());
    initMock.mockClear();
    captureMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('default OFF: track è no-op, posthog mai caricato', async () => {
    vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
    const { track, isAnalyticsEnabled } = await freshModule();
    expect(isAnalyticsEnabled()).toBe(false);
    await track('app_opened');
    expect(initMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('setAnalyticsEnabled(true) persiste "1" e riattiva il flag', async () => {
    const m1 = await freshModule();
    m1.setAnalyticsEnabled(true);
    expect(m1.isAnalyticsEnabled()).toBe(true);
    expect(localStorage.getItem('lucidme:analytics:enabled')).toBe('1');
    // Un re-import (nuova "sessione") legge il flag persistito.
    const m2 = await freshModule();
    expect(m2.isAnalyticsEnabled()).toBe(true);
  });

  it('setAnalyticsEnabled(false) rimuove la chiave', async () => {
    const m1 = await freshModule();
    m1.setAnalyticsEnabled(true);
    m1.setAnalyticsEnabled(false);
    expect(localStorage.getItem('lucidme:analytics:enabled')).toBeNull();
    const m2 = await freshModule();
    expect(m2.isAnalyticsEnabled()).toBe(false);
  });

  it('attivo ma senza PUBLIC_POSTHOG_KEY: no-op silenzioso', async () => {
    const { track, setAnalyticsEnabled } = await freshModule();
    setAnalyticsEnabled(true);
    await track('dream_saved', { has_voice: false, lucidity: 1 });
    expect(initMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('attivo + chiave: init UNA volta, capture con evento e props', async () => {
    vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
    vi.stubEnv('PUBLIC_POSTHOG_HOST', 'https://eu.i.posthog.com');
    const { track, setAnalyticsEnabled } = await freshModule();
    setAnalyticsEnabled(true);
    await track('dream_saved', { has_voice: true, lucidity: 2 });
    await track('paywall_viewed');
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledWith('phc_test', expect.objectContaining({ api_host: 'https://eu.i.posthog.com', autocapture: false }));
    expect(captureMock).toHaveBeenCalledTimes(2);
    expect(captureMock).toHaveBeenNthCalledWith(1, 'dream_saved', { has_voice: true, lucidity: 2 });
    expect(captureMock).toHaveBeenNthCalledWith(2, 'paywall_viewed', undefined);
  });

  it('storage che lancia: default off e setAnalyticsEnabled non rompe', async () => {
    vi.stubGlobal('localStorage', new ThrowingStorage());
    const m = await freshModule();
    expect(m.isAnalyticsEnabled()).toBe(false);
    expect(() => m.setAnalyticsEnabled(true)).not.toThrow();
    // Flag in memoria per la sessione corrente nonostante lo storage negato.
    expect(m.isAnalyticsEnabled()).toBe(true);
  });
});
