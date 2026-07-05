/**
 * Test di forma degli hint OEM (§S4-3, §S4-5).
 *
 * Verifichiamo shape e lookup, non il contenuto (testuale, soggetto a PM).
 */
import { describe, it, expect } from 'vitest';
import { OEM_HINTS, getOemHint } from './oem-hints.js';

describe('oem-hints — §S4-3', () => {
  it('ci sono almeno i 4 vendor principali', () => {
    expect(OEM_HINTS.xiaomi).toBeDefined();
    expect(OEM_HINTS.samsung).toBeDefined();
    expect(OEM_HINTS.huawei).toBeDefined();
    expect(OEM_HINTS.oppo).toBeDefined();
  });

  it('ogni hint ha vendor, issue non vuota, steps non vuoti', () => {
    for (const h of Object.values(OEM_HINTS)) {
      expect(h.vendor.length).toBeGreaterThan(0);
      expect(h.issue.length).toBeGreaterThan(0);
      expect(h.steps.length).toBeGreaterThan(0);
    }
  });

  it('getOemHint è case-insensitive', () => {
    expect(getOemHint('Xiaomi')?.vendor).toBe('Xiaomi / MIUI');
    expect(getOemHint('SAMSUNG')?.vendor).toBe('Samsung / One UI');
  });

  it('getOemHint ritorna null per vendor sconosciuto', () => {
    expect(getOemHint('google')).toBeNull();
  });
});
