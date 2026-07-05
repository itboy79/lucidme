import type { Dream } from '../domain/dream.js';
import { isInWeek } from './weeks.js';

/**
 * Conteggio sogni lucidi in una settimana.
 * Regola §S6-1: lucidity >= 2 conta (lucido + pieno controllo).
 * Il "barlume" (1) NON conta — decisione fissa.
 */
export function lucidCountInWeek(dreams: Dream[], weekStart: string): number {
  return dreams.filter(
    (d) => d.deletedAt === null && d.lucidity >= 2 && isInWeek(d.dreamedOn, weekStart),
  ).length;
}

/** Totale sogni non-deleted sognati nella settimana. */
export function dreamCountInWeek(dreams: Dream[], weekStart: string): number {
  return dreams.filter((d) => d.deletedAt === null && isInWeek(d.dreamedOn, weekStart)).length;
}
