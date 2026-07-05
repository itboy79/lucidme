/**
 * Tipi per il motore metriche (Step 6 — Lume).
 * Tutti i calcoli vivono in @lucidme/core, puri e testabili.
 */

/** Una settimana di attività onirica. weekStart è sempre un lunedì 'YYYY-MM-DD'. */
export interface WeeklyMetric {
  weekStart: string; // 'YYYY-MM-DD' (lunedì)
  lucidCount: number; // sogni con lucidity >= 2 nella settimana
  dreamCount: number; // sogni non-deleted sognati nella settimana
  recallScore: number; // 0..100
  rcResponseRate: number; // 0..1
}

/** Range di date ISO 'YYYY-MM-DD' per computeWeekly. */
export interface MetricRange {
  from: string;
  to: string;
}

/**
 * Evento reality check. Definito qui (home comune) così Step 5 (RCRepo) e Step 6
 * (metriche) condividono lo stesso tipo.
 * acknowledged: null = pending, 1 = "stavo sognando", 0 = "ero sveglio".
 */
export interface RealityCheckEvent {
  id: string;
  firedAt: string; // ISO8601
  acknowledged: number | null;
  promptId?: string;
}
