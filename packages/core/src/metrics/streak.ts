import type { Dream } from '../domain/dream.js';
import { todayLocal } from '../domain/dream.js';
import { addDays } from './weeks.js';

/**
 * streak = giorni consecutivi all'indietro da today con >=1 dream entry (per dreamedOn).
 * Timezone device. Se today non ha entry, streak = 0 (non "perdona" oggi).
 *
 * NB: se si vuole "grace period" di 1 giorno (oggi vuoto ma ieri sì → conta da ieri),
 * è una decisione di prodotto: §S6-1 non lo specifica. v1: strict (today inclusa).
 */
export function currentStreak(dreams: Dream[], today: string = todayLocal()): number {
  const daysWithDream = new Set(
    dreams.filter((d) => d.deletedAt === null).map((d) => d.dreamedOn),
  );
  let streak = 0;
  let cursor = today;
  let guard = 0;
  while (daysWithDream.has(cursor) && guard < 10000) {
    streak++;
    cursor = addDays(cursor, -1);
    guard++;
  }
  return streak;
}
