/**
 * Factory del backend sveglia (§S4-3).
 *
 * Sceglie nativo (Capacitor) vs web (PWA) tramite `isNative()`. Import
 * dinamico: il path nativo è caricato SOLO su dispositivo reale, così il
 * bundle web non contiene riferimenti a `@capacitor/*`.
 *
 * Espone anche un'API di "alto livello" che combina scheduler + backend per
 * chi vuole chiamare direttamente senza gestire l'injection.
 */
import type { AlarmBackend, AlarmOptions } from './types.js';
import { isNative } from './types.js';

/** Cache del backend scelto (la piattaforma non cambia a runtime). */
let cached: AlarmBackend | null = null;

/** Ritorna il backend appropriato (nativo su device, web su PWA). */
export async function getAlarmBackend(): Promise<AlarmBackend> {
  if (cached) return cached;
  if (await isNative()) {
    const { nativeBackend } = await import('./native.js');
    cached = nativeBackend;
  } else {
    const { webBackend } = await import('./web.js');
    cached = webBackend;
  }
  return cached;
}

/** Reset cache (solo test). */
export function _resetAlarmBackendCache(): void {
  cached = null;
}

// Re-export dell'API pubblica.
export { scheduleWBTB, cancelWBTB, getScheduled } from './scheduler.js';
export { nativeBackend } from './native.js';
export { webBackend } from './web.js';
export { onAppResume } from './native.js';
export { OEM_HINTS, getOemHint } from './oem-hints.js';
export type { AlarmBackend, AlarmOptions } from './types.js';
export { ALARM_ID_WBTB, ALARM_ID_RC_BASE, isNative } from './types.js';

/**
 * Helper ad alto livello: pianifica WBTB col backend corrente. Comodo per la
 * UI che non vuole gestire l'injection manualmente.
 */
export async function scheduleWBTBAuto(
  at: Date,
  opts?: AlarmOptions,
): Promise<void> {
  const { scheduleWBTB } = await import('./scheduler.js');
  const backend = await getAlarmBackend();
  await scheduleWBTB(at, backend, opts);
}

/** Helper ad alto livello: cancella WBTB col backend corrente. */
export async function cancelWBTBAuto(): Promise<void> {
  const { cancelWBTB } = await import('./scheduler.js');
  const backend = await getAlarmBackend();
  await cancelWBTB(backend);
}
