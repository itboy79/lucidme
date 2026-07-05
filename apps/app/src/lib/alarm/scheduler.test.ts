/**
 * Test dello scheduler WBTB (§S4-3 DoD).
 *
 * Mock del backend: verifichiamo schedule/cancel/getScheduled senza dipendere
 * da Capacitor né dal browser. Lo scheduler è puro orchestratore.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { AlarmBackend, AlarmOptions } from './types.js';
import { scheduleWBTB, cancelWBTB, getScheduled, _resetScheduled } from './scheduler.js';

interface MockCall {
  type: 'schedule' | 'cancel';
  id: number;
  at?: Date;
  opts?: AlarmOptions;
}

function mockBackend(): { backend: AlarmBackend; calls: MockCall[] } {
  const calls: MockCall[] = [];
  const backend: AlarmBackend = {
    kind: 'native',
    reliable: true,
    async schedule(id, at, opts) {
      calls.push({ type: 'schedule', id, at, opts });
    },
    async cancel(id) {
      calls.push({ type: 'cancel', id });
    },
  };
  return { backend, calls };
}

describe('scheduler WBTB — §S4-3', () => {
  beforeEach(() => _resetScheduled());

  it('scheduleWBTB prima cancella poi pianifica', async () => {
    const { backend, calls } = mockBackend();
    const at = new Date('2025-07-05T04:40:00.000Z');
    await scheduleWBTB(at, backend, { sound: '/audio/alarms/marea.mp3' });
    // ordine: cancel(WBTB id) poi schedule(WBTB id)
    expect(calls[0]?.type).toBe('cancel');
    expect(calls[0]?.id).toBe(1001);
    expect(calls[1]?.type).toBe('schedule');
    expect(calls[1]?.id).toBe(1001);
    expect(calls[1]?.at).toEqual(at);
    expect(calls[1]?.opts?.sound).toBe('/audio/alarms/marea.mp3');
  });

  it('getScheduled ritorna il tempo pianificato', async () => {
    const { backend } = mockBackend();
    expect(getScheduled()).toBeNull();
    const at = new Date('2025-07-05T05:00:00.000Z');
    await scheduleWBTB(at, backend);
    expect(getScheduled()).toEqual(at);
  });

  it('cancelWBTB cancella e resetta lo stato', async () => {
    const { backend, calls } = mockBackend();
    const at = new Date('2025-07-05T05:00:00.000Z');
    await scheduleWBTB(at, backend);
    await cancelWBTB(backend);
    expect(calls.at(-1)?.type).toBe('cancel');
    expect(calls.at(-1)?.id).toBe(1001);
    expect(getScheduled()).toBeNull();
  });

  it('riesecuzione di scheduleWBTB sostituisce la sveglia precedente', async () => {
    const { backend, calls } = mockBackend();
    await scheduleWBTB(new Date('2025-07-05T04:40:00.000Z'), backend);
    await scheduleWBTB(new Date('2025-07-05T05:10:00.000Z'), backend);
    // due cancel + due schedule
    const cancels = calls.filter((c) => c.type === 'cancel');
    const schedules = calls.filter((c) => c.type === 'schedule');
    expect(cancels.length).toBe(2);
    expect(schedules.length).toBe(2);
    expect(getScheduled()).toEqual(new Date('2025-07-05T05:10:00.000Z'));
  });
});
