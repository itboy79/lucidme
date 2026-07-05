/**
 * Load del Sentiero (§S3-3).
 *
 * Fornisce alla page i contenuti statici:
 *  - tutte le lezioni (21) dal bundle;
 *  - le fasi con i relativi range di giorni.
 *
 * Il progresso (giorno corrente, giorni completati) è letto lato client in
 * onMount, perché il DB SQLite è asincrono e SSR è off. Qui solo dati statici
 * (zero costo, deterministici).
 */
import type { Lesson, Phase } from '@lucidme/content';
import { getAllLessons, getPhases } from '@lucidme/content';

export interface SentieroData {
  lessons: Lesson[];
  phases: readonly { phase: Phase; dayRange: [number, number] }[];
}

export const load = (): SentieroData => {
  return {
    lessons: getAllLessons(),
    phases: getPhases(),
  };
};
