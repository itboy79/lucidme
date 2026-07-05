/**
 * Scheduler WBTB (§S4-3) — logica di scheduling platform-agnostic.
 *
 * L'unico ruolo di questo modulo è orchestrare il backend iniettato:
 *  - `scheduleWBTB(at)` cancella la sveglia precedente e ne pianifica una nuova;
 *  - `cancelWBTB()` cancella;
 *  - `getScheduled()` ritorna il tempo pianificato (o null), tenuto in memoria.
 *
 * Nessuna logica di platform qui: il backend (`AlarmBackend`) è iniettato dal
 * `index.ts` (factory). Così lo scheduler è puro e testabile con un mock.
 *
 * L'affidabilità dipende dal backend: `backend.reliable` dice se siamo su nativo.
 */
import type { AlarmBackend, AlarmOptions } from './types.js';
import { ALARM_ID_WBTB } from './types.js';

/** Stato in memoria della sveglia pianificata (idempotenza UI). */
let scheduledTime: Date | null = null;

/** Cancella + pianifica la sveglia WBTB al tempo `at`. */
export async function scheduleWBTB(
  at: Date,
  backend: AlarmBackend,
  opts?: AlarmOptions,
): Promise<void> {
  await backend.cancel(ALARM_ID_WBTB);
  await backend.schedule(ALARM_ID_WBTB, at, opts);
  scheduledTime = at;
}

/** Cancella la sveglia WBTB (no-op se nessuna pianificata). */
export async function cancelWBTB(backend: AlarmBackend): Promise<void> {
  await backend.cancel(ALARM_ID_WBTB);
  scheduledTime = null;
}

/** Il tempo della sveglia pianificata, o null. */
export function getScheduled(): Date | null {
  return scheduledTime;
}

/**
 * Re-sync dal backend: utile dopo reboot app quando lo stato in memoria è perso.
 * Non implementato a fondo (il backend nativo espone `getPending` via plugin),
 * ma l'hook esiste per i test e per la fase 2.
 */
export function _resetScheduled(): void {
  scheduledTime = null;
}
