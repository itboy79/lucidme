import type { Dream } from '../domain/dream.js';
import { tokenize } from '../analysis/sign-detection.js';
import { addDays } from './weeks.js';

const WORDS_FULL = 300; // soglia ricordo pieno: ≈300 parole = 100

/**
 * Mappa day('YYYY-MM-DD') → conteggio parole totali dei sogni non-deleted di quel giorno.
 * Pre-calcolata una volta per tutte le settimane (evita ritokenizzare ad ogni chiamata).
 */
export function buildWordCountMap(dreams: Dream[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of dreams) {
    if (d.deletedAt !== null) continue;
    const words = tokenize(d.body).length;
    map.set(d.dreamedOn, (map.get(d.dreamedOn) ?? 0) + words);
  }
  return map;
}

/**
 * recallScore settimanale (0..100). Definizione §S6-1:
 * per ogni giorno della settimana: min(100, parole_del_giorno / WORDS_FULL * 100).
 * ≈300 parole = ricordo pieno (100). Giorni senza entry contano 0.
 * Media sui 7 giorni.
 *
 * Soglia §S3-5: < 40 = recall bassa → inserimento extra recall nel Sentiero.
 *
 * Accetta opzionalmente una wordCountMap pre-calcolata (buildWordCountMap) per
 * evitare ritokenizzazione quando si calcolano molte settimane (computeWeekly).
 */
export function recallScoreForWeek(
  dreams: Dream[],
  weekStart: string,
  wordCountMap?: Map<string, number>,
): number {
  const map = wordCountMap ?? buildWordCountMap(dreams);
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dayWords = map.get(day) ?? 0;
    sum += Math.min(100, (dayWords / WORDS_FULL) * 100);
  }
  return sum / 7;
}
