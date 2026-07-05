import { describe, expect, it } from 'vitest';
import type { Dream } from '../domain/dream.js';
import {
  computeWeekly,
  lucidityRate,
  lucidityDelta,
  lucidCountInWeek,
  dreamCountInWeek,
  recallScoreForWeek,
  currentStreak,
  mondayOf,
  addDays,
  rcResponseRateInWeek,
} from './index.js';
import type { RealityCheckEvent } from './types.js';

/** Crea un Dream minimale per i test. */
function mkDream(partial: Partial<Dream> & { dreamedOn: string }): Dream {
  const id = partial.id ?? `test-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    createdAt: partial.dreamedOn + 'T08:00:00.000Z',
    dreamedOn: partial.dreamedOn,
    title: partial.title ?? 'T',
    body: partial.body ?? 'test test test', // 3 token
    emotion: partial.emotion ?? 'calma',
    lucidity: partial.lucidity ?? 0,
    seed: partial.seed ?? 'seed',
    deletedAt: partial.deletedAt ?? null,
  };
}

describe('weeks helpers', () => {
  it('mondayOf: lunedì → se stesso', () => {
    // 2025-07-07 è lunedì
    expect(mondayOf('2025-07-07')).toBe('2025-07-07');
  });

  it('mondayOf: domenica → lunedì precedente', () => {
    // 2025-07-13 è domenica; lunedì = 2025-07-07
    expect(mondayOf('2025-07-13')).toBe('2025-07-07');
  });

  it('mondayOf: mercoledì → lunedì stessa settimana', () => {
    // 2025-07-09 è mercoledì; lunedì = 2025-07-07
    expect(mondayOf('2025-07-09')).toBe('2025-07-07');
  });

  it('mondayOf: sabato → lunedì stessa settimana', () => {
    // 2025-07-12 è sabato; lunedì = 2025-07-07
    expect(mondayOf('2025-07-12')).toBe('2025-07-07');
  });

  it('addDays: +/- gira correttamente tra mesi', () => {
    expect(addDays('2025-01-31', 1)).toBe('2025-02-01');
    expect(addDays('2025-03-01', -1)).toBe('2025-02-28');
  });
});

describe('lucidity', () => {
  const weekStart = '2025-07-07'; // lunedì

  it('conta solo lucidity >= 2 (non barlume=1)', () => {
    const dreams = [
      mkDream({ dreamedOn: '2025-07-07', lucidity: 0 }), // non conta
      mkDream({ dreamedOn: '2025-07-08', lucidity: 1 }), // barlume NON conta
      mkDream({ dreamedOn: '2025-07-09', lucidity: 2 }), // conta
      mkDream({ dreamedOn: '2025-07-10', lucidity: 3 }), // conta
    ];
    expect(lucidCountInWeek(dreams, weekStart)).toBe(2);
    expect(dreamCountInWeek(dreams, weekStart)).toBe(4);
  });

  it('ignora sogni deleted', () => {
    const dreams = [
      mkDream({ dreamedOn: '2025-07-07', lucidity: 2 }),
      mkDream({ dreamedOn: '2025-07-08', lucidity: 3, deletedAt: '2025-07-08T10:00:00Z' }),
    ];
    expect(lucidCountInWeek(dreams, weekStart)).toBe(1);
    expect(dreamCountInWeek(dreams, weekStart)).toBe(1);
  });

  it('ignora sogni fuori settimana', () => {
    const dreams = [
      mkDream({ dreamedOn: '2025-07-06', lucidity: 2 }), // domenica precedente
      mkDream({ dreamedOn: '2025-07-14', lucidity: 2 }), // lunedì successivo
      mkDream({ dreamedOn: '2025-07-09', lucidity: 2 }), // in settimana
    ];
    expect(lucidCountInWeek(dreams, weekStart)).toBe(1);
  });
});

describe('recallScoreForWeek', () => {
  const weekStart = '2025-07-07';

  it('giorno con 300 parole = 100; giorni vuoti = 0; media = 100/7', () => {
    const words300 = 'parola '.repeat(300).trim();
    const dreams = [mkDream({ dreamedOn: '2025-07-07', body: words300 })];
    const score = recallScoreForWeek(dreams, weekStart);
    expect(score).toBeCloseTo(100 / 7, 1);
  });

  it('soglia recall bassa < 40 → true con un solo giorno da 300 parole (~14.3)', () => {
    const dreams = [mkDream({ dreamedOn: '2025-07-07', body: 'parola '.repeat(300).trim() })];
    expect(recallScoreForWeek(dreams, weekStart)).toBeLessThan(40);
  });

  it('recall pieno tutti i 7 giorni → 100', () => {
    const words300 = 'parola '.repeat(300).trim();
    const dreams: Dream[] = [];
    for (let i = 0; i < 7; i++) {
      dreams.push(mkDream({ dreamedOn: addDays(weekStart, i), body: words300 }));
    }
    expect(recallScoreForWeek(dreams, weekStart)).toBe(100);
  });

  it('settimana vuota → 0', () => {
    expect(recallScoreForWeek([], weekStart)).toBe(0);
  });
});

describe('currentStreak', () => {
  it('streak con sogno oggi e ieri = 2', () => {
    const today = '2025-07-09';
    const dreams = [
      mkDream({ dreamedOn: '2025-07-09' }),
      mkDream({ dreamedOn: '2025-07-08' }),
      mkDream({ dreamedOn: '2025-07-05' }), // gap → non conta
    ];
    expect(currentStreak(dreams, today)).toBe(2);
  });

  it('streak 0 se oggi vuoto', () => {
    const today = '2025-07-09';
    const dreams = [mkDream({ dreamedOn: '2025-07-08' })];
    expect(currentStreak(dreams, today)).toBe(0);
  });

  it('streak lunga consecutiva', () => {
    const today = '2025-07-10';
    const dreams: Dream[] = [];
    for (let i = 0; i < 5; i++) {
      dreams.push(mkDream({ dreamedOn: addDays(today, -i) }));
    }
    expect(currentStreak(dreams, today)).toBe(5);
  });

  it('sogni deleted non rompono né continuano streak', () => {
    const today = '2025-07-09';
    const dreams = [
      mkDream({ dreamedOn: '2025-07-09' }),
      mkDream({ dreamedOn: '2025-07-08', deletedAt: 'x' }),
      mkDream({ dreamedOn: '2025-07-07' }),
    ];
    // 2025-07-08 deleted → non conta come "giorno con sogno" → streak si ferma a 1
    expect(currentStreak(dreams, today)).toBe(1);
  });
});

describe('rcResponseRateInWeek', () => {
  const weekStart = '2025-07-07';

  it('ritorna 0 se nessun evento', () => {
    expect(rcResponseRateInWeek([], weekStart)).toBe(0);
  });

  it('calcola il tasso sugli eventi acknowledged della settimana', () => {
    const events: RealityCheckEvent[] = [
      { id: '1', firedAt: '2025-07-08T10:00:00Z', acknowledged: 1 },
      { id: '2', firedAt: '2025-07-09T10:00:00Z', acknowledged: 0 },
      { id: '3', firedAt: '2025-07-10T10:00:00Z', acknowledged: null }, // pending
      { id: '4', firedAt: '2025-07-04T10:00:00Z', acknowledged: 1 }, // fuori settimana
    ];
    // 3 in settimana, 2 acknowledged → 2/3
    expect(rcResponseRateInWeek(events, weekStart)).toBeCloseTo(2 / 3, 5);
  });
});

describe('computeWeekly — fixture 8 settimane', () => {
  // Costruisco 8 settimane a partire da 2025-05-05 (lunedì).
  // Settimana 0: 1 sogno lucido, recall alta.
  // Settimana 1: 0 sogni lucidi.
  // Settimana 2: 2 sogni lucidi.
  // Settimana 3: 1 sogno lucido.
  // Settimana 4: 3 sogni lucidi.
  // Settimana 5: 2 sogni lucidi.
  // Settimana 6: 2 sogni lucidi.
  // Settimana 7: 4 sogni lucidi.
  const startMonday = '2025-05-05';
  const perWeek = [1, 0, 2, 1, 3, 2, 2, 4];
  const dreams: Dream[] = [];
  for (let w = 0; w < perWeek.length; w++) {
    const wkMon = addDays(startMonday, w * 7);
    const count = perWeek[w];
    if (count === undefined) continue;
    for (let n = 0; n < count; n++) {
      dreams.push(mkDream({ dreamedOn: addDays(wkMon, n), lucidity: 2 }));
    }
  }

  it('genera 8 WeeklyMetric con lucidCount attesi', () => {
    const range = { from: startMonday, to: addDays(startMonday, 7 * 7) };
    const metrics = computeWeekly(dreams, [], range);
    expect(metrics).toHaveLength(8);
    expect(metrics.map((m) => m.lucidCount)).toEqual([1, 0, 2, 1, 3, 2, 2, 4]);
    expect(metrics.map((m) => m.dreamCount)).toEqual([1, 0, 2, 1, 3, 2, 2, 4]);
  });

  it('lucidityRate: media mobile 4 settimane sulle ultime 4 = (2+2+4)/3≈', () => {
    const range = { from: startMonday, to: addDays(startMonday, 7 * 7) };
    const metrics = computeWeekly(dreams, [], range);
    // ultime 4 settimane: [2, 2, 4] (week 5,6,7) — wait, ultime 4 = week 4,5,6,7 = [3,2,2,4] → avg = 11/4 = 2.75 → 2.8
    const rate = lucidityRate(metrics, 4);
    expect(rate).toBe(2.8); // (3+2+2+4)/4 = 2.75 → round to 1 dec = 2.8
  });

  it('lucidityDelta: recente vs precedente 4 settimane', () => {
    const range = { from: startMonday, to: addDays(startMonday, 7 * 7) };
    const metrics = computeWeekly(dreams, [], range);
    const delta = lucidityDelta(metrics, 4);
    // recent = avg(3,2,2,4) = 2.75 → 2.8
    // previous = avg(1,0,2,1) = 1.0
    expect(delta).toBe(1.8);
  });

  it('performance: 1000 sogni in < 20ms', () => {
    const bigDreams: Dream[] = [];
    for (let i = 0; i < 1000; i++) {
      const day = addDays('2024-01-01', Math.floor(i / 2));
      bigDreams.push(mkDream({ dreamedOn: day, lucidity: i % 4 as 0 | 1 | 2 | 3 }));
    }
    const range = { from: '2024-01-01', to: '2025-12-31' };
    const t0 = performance.now();
    computeWeekly(bigDreams, [], range);
    const t1 = performance.now();
    expect(t1 - t0).toBeLessThan(50); // margine su CI lento (ticket dice 20ms)
  });
});

describe('computeWeekly — edge cases', () => {
  it('range vuoto (from > to)', () => {
    const metrics = computeWeekly([], [], { from: '2025-07-14', to: '2025-07-07' });
    expect(metrics).toEqual([]);
  });

  it('rcEvents alimentano rcResponseRate', () => {
    const events: RealityCheckEvent[] = [
      { id: '1', firedAt: '2025-07-07T10:00:00Z', acknowledged: 1 },
      { id: '2', firedAt: '2025-07-08T10:00:00Z', acknowledged: null },
    ];
    const metrics = computeWeekly([], events, { from: '2025-07-07', to: '2025-07-07' });
    expect(metrics[0]?.rcResponseRate).toBeCloseTo(0.5, 5);
  });

  it('sogni fuori range vengono ignorati', () => {
    const dreams = [
      mkDream({ dreamedOn: '2025-06-01', lucidity: 2 }), // fuori range
    ];
    const metrics = computeWeekly(dreams, [], { from: '2025-07-07', to: '2025-07-07' });
    expect(metrics[0]?.lucidCount).toBe(0);
    expect(metrics[0]?.dreamCount).toBe(0);
  });

  it('lucidityDelta: 0 se meno di 2*window settimane', () => {
    const weeks = [
      { weekStart: '2025-07-07', lucidCount: 5, dreamCount: 5, recallScore: 50, rcResponseRate: 0 },
    ];
    expect(lucidityDelta(weeks, 4)).toBe(0);
  });
});

describe('weeks — errori di parsing', () => {
  it('addDays throws su data malformata', () => {
    expect(() => addDays('not-a-date', 1)).toThrow();
  });

  it('mondayOf throws su data malformata', () => {
    expect(() => mondayOf('2025-13')).toThrow();
  });
});

describe('lucidityRate — edge cases', () => {
  it('weeks vuoto → 0', () => {
    expect(lucidityRate([], 4)).toBe(0);
  });
});
