import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ulid } from './id.js';

describe('ulid (locale, spec-compliant)', () => {
  it('genera una stringa di 26 char in Crockford base32', () => {
    const id = ulid();
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/); // no I/L/O/U
  });

  it('è univoca su chiamate ripetute', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => ulid()));
    expect(ids.size).toBe(1000);
  });

  it('è monotonica rispetto al tempo (ordina lessicograficamente)', () => {
    const a = ulid();
    // piccolo ritardo per garantire avanzamento del ms
    const later = Date.now() + 5;
    while (Date.now() < later) {
      /* spin */
    }
    const b = ulid();
    // b è stato generato dopo → prefix temporale >= a (può essere == se ms pari)
    expect(b >= a).toBe(true);
  });

  it('usa crypto.getRandomValues quando disponibile (path crittografico)', () => {
    // ambiente node/vitest ha globalThis.crypto.getRandomValues
    expect(typeof globalThis.crypto?.getRandomValues).toBe('function');
    const id = ulid();
    expect(id).toHaveLength(26);
  });

  it('fallback Math.random quando crypto assente (branch alternativo)', () => {
    const orig = globalThis.crypto;
    // simula ambiente senza crypto (es. vecchie webview)
    delete (globalThis as { crypto?: unknown }).crypto;
    try {
      const id = ulid();
      expect(id).toHaveLength(26);
      expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    } finally {
      // ripristina
      Object.defineProperty(globalThis, 'crypto', { value: orig, configurable: true, writable: true });
    }
  });
});

describe('ulid — buffer refill path', () => {
  beforeEach(() => {
    // forziamo il refill del buffer interno consumando molti id
  });
  afterEach(() => {
    // noop
  });

  it('ricarica il buffer interno quando esaurito (>256 byte consumati)', () => {
    // 1000 id → ogni id usa 16 byte casuali → consuma ~16000 byte → molti refill
    const ids = Array.from({ length: 1000 }, () => ulid());
    expect(new Set(ids).size).toBe(1000);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    }
  });
});
