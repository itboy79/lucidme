import type { Dream } from '../domain/dream.js';
import { recallScoreForWeek, buildWordCountMap } from './recall.js';
import { mondayOf, eachMonday, addDays } from './weeks.js';
import type { WeeklyMetric, MetricRange, RealityCheckEvent } from './types.js';

/**
 * Tasso di risposta reality check in una settimana:
 * eventi fired in settimana con acknowledged !== null  /  total fired in settimana.
 */
export function rcResponseRateInWeek(
  events: RealityCheckEvent[],
  weekStart: string,
): number {
  const end = addDays(weekStart, 7);
  const inWeek = events.filter((e) => {
    // firedAt è ISO8601; estraiamo 'YYYY-MM-DD'
    const day = e.firedAt.slice(0, 10);
    return day >= weekStart && day < end;
  });
  if (inWeek.length === 0) return 0;
  const acknowledged = inWeek.filter((e) => e.acknowledged !== null).length;
  return acknowledged / inWeek.length;
}

/**
 * Calcola WeeklyMetric[] per ogni settimana nel range.
 * Puro: nessun accesso db. Input: dreams + rcEvents già caricati.
 */
export function computeWeekly(
  dreams: Dream[],
  rcEvents: RealityCheckEvent[],
  range: MetricRange,
): WeeklyMetric[] {
  const fromMon = mondayOf(range.from);
  const toMon = mondayOf(range.to);
  const weeks = eachMonday(fromMon, toMon);
  if (weeks.length === 0) return [];

  // Indicizzazione per settimana in UN solo passaggio sui sogni (O(dreams), non O(weeks*dreams)).
  // Per ogni weekStart: { dreamCount, lucidCount }.
  const idx = new Map<string, { dreamCount: number; lucidCount: number }>();
  for (const w of weeks) idx.set(w, { dreamCount: 0, lucidCount: 0 });
  for (const d of dreams) {
    if (d.deletedAt !== null) continue;
    const w = mondayOf(d.dreamedOn);
    const entry = idx.get(w);
    if (!entry) continue; // sogno fuori range
    entry.dreamCount++;
    if (d.lucidity >= 2) entry.lucidCount++;
  }

  // Pre-calcolo parole per giorno (un solo passaggio, niente ritokenizzazione).
  const wordCountMap = buildWordCountMap(dreams);

  // Pre-indicizzazione RC per settimana.
  const rcIdx = new Map<string, { total: number; ack: number }>();
  for (const w of weeks) rcIdx.set(w, { total: 0, ack: 0 });
  for (const e of rcEvents) {
    const day = e.firedAt.slice(0, 10);
    const w = mondayOf(day);
    const entry = rcIdx.get(w);
    if (!entry) continue;
    entry.total++;
    if (e.acknowledged !== null) entry.ack++;
  }

  return weeks.map((weekStart) => {
    const de = idx.get(weekStart);
    const rc = rcIdx.get(weekStart);
    return {
      weekStart,
      lucidCount: de?.lucidCount ?? 0,
      dreamCount: de?.dreamCount ?? 0,
      recallScore: Math.round(recallScoreForWeek(dreams, weekStart, wordCountMap) * 100) / 100,
      rcResponseRate: rc && rc.total > 0 ? rc.ack / rc.total : 0,
    };
  });
}

/**
 * North star metric (§7.7): lucidity rate = media mobile del lucidCount sulle ultime N settimane.
 * Ritorna sogni lucidi/settimana con 1 decimale.
 */
export function lucidityRate(weeks: WeeklyMetric[], mobileWindow = 4): number {
  if (weeks.length === 0) return 0;
  const slice = weeks.slice(-mobileWindow);
  const sum = slice.reduce((acc, w) => acc + w.lucidCount, 0);
  const avg = sum / slice.length;
  return Math.round(avg * 10) / 10;
}

/** Delta del lucidityRate tra ultime 4 settimane e 4 settimane precedenti. */
export function lucidityDelta(weeks: WeeklyMetric[], mobileWindow = 4): number {
  if (weeks.length < mobileWindow) return 0;
  const recent = weeks.slice(-mobileWindow);
  const previous = weeks.slice(-mobileWindow * 2, -mobileWindow);
  if (previous.length === 0) return 0;
  return Math.round((lucidityRate(recent) - lucidityRate(previous)) * 10) / 10;
}
