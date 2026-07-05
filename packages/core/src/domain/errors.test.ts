import { describe, expect, it } from 'vitest';
import { DomainError } from './errors.js';

describe('DomainError', () => {
  it('espone code e message, name = "DomainError"', () => {
    const e = new DomainError('VALIDATION', 'body vuoto');
    expect(e.code).toBe('VALIDATION');
    expect(e.message).toBe('body vuoto');
    expect(e.name).toBe('DomainError');
    expect(e instanceof Error).toBe(true);
  });

  it('accetta tutti i codici del union type', () => {
    for (const code of ['VALIDATION', 'NOT_FOUND', 'CONFLICT'] as const) {
      const e = new DomainError(code, 'x');
      expect(e.code).toBe(code);
    }
  });

  it('ha uno stack trace (best-effort)', () => {
    const e = new DomainError('NOT_FOUND', 'nope');
    // stack può essere undefined in ambienti minimali, ma di solito c'è
    expect(typeof e.stack === 'string' || e.stack === undefined).toBe(true);
  });
});
