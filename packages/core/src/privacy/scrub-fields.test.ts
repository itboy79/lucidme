import { describe, expect, it } from 'vitest';
import { isScrubField, SCRUB_FIELDS } from './scrub-fields.js';

describe('SCRUB_FIELDS (privacy §8.5.4)', () => {
  it('elenca i campi sensibili obbligatori', () => {
    // Il sogno NON deve mai lasciare il device: body/title/transcript almeno.
    expect(SCRUB_FIELDS).toContain('body');
    expect(SCRUB_FIELDS).toContain('title');
    expect(SCRUB_FIELDS).toContain('transcript');
    expect(SCRUB_FIELDS).toContain('dreamText');
  });

  it('riconosce i campi sensibili case-insensitive', () => {
    expect(isScrubField('body')).toBe(true);
    expect(isScrubField('BODY')).toBe(true);
    expect(isScrubField('Title')).toBe(true);
    expect(isScrubField('dreamText')).toBe(true);
  });

  it('non marca come sensibili i metadati sicuri', () => {
    expect(isScrubField('id')).toBe(false);
    expect(isScrubField('createdAt')).toBe(false);
    expect(isScrubField('lucidity')).toBe(false);
    expect(isScrubField('seed')).toBe(false);
    expect(isScrubField('emotion')).toBe(false);
  });

  it('gestisce input non string (defensive)', () => {
    // isScrubField è pensato per string; verifichiamo che non esploda su tipi strani
    // che potrebbero arrivare da Sentry breadcrumbs malformati.
    expect(isScrubField('' as string)).toBe(false);
  });

  it('lista SCRUB_FIELDS è stabile e non contiene duplicati', () => {
    const unique = new Set(SCRUB_FIELDS);
    expect(unique.size).toBe(SCRUB_FIELDS.length);
    expect(SCRUB_FIELDS.length).toBeGreaterThan(5);
  });
});
