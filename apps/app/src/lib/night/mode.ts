/**
 * night/mode.ts — gestione globale della modalità notte (§S4-1).
 *
 * Aggiunge/rimuove `data-night="true"` su <html> 30 min prima dell'ora-sonno
 * impostata, e lo toglie 30 min dopo l'ora-sveglia. Ricalcolato ogni minuto e
 * al cambio delle impostazioni sonno.
 *
 * Effetto collaterale sul DOM: chiamare `startNightModeEffect()` in un $effect
 * del layout; ritorna una funzione di cleanup.
 */
import { settingsStore } from '../stores/settings.svelte.js';
import { toMinutes } from '../stores/settings.svelte.js';

const NIGHT_PADDING_MIN = 30; // 30 min prima/ dopo

/** True se "ora" è in finestra notte per le impostazioni date. */
export function isNightNow(
  now: Date,
  sleepTime: string,
  wakeTime: string,
): boolean {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const sleep = toMinutes(sleepTime);
  const wake = toMinutes(wakeTime);
  const start = (sleep - NIGHT_PADDING_MIN + 24 * 60) % (24 * 60);
  const end = (wake + NIGHT_PADDING_MIN) % (24 * 60);
  if (start <= end) {
    return nowMin >= start && nowMin <= end;
  }
  // finestra attraversa mezzanotte
  return nowMin >= start || nowMin <= end;
}

/** Applica/rimuove l'attributo su <html> in base all'orario corrente. */
export function applyNightMode(): void {
  if (typeof document === 'undefined') return;
  const night = isNightNow(
    new Date(),
    settingsStore.current.sleepTime,
    settingsStore.current.wakeTime,
  );
  document.documentElement.setAttribute('data-night', night ? 'true' : 'false');
}

/**
 * Avvia l'effetto: applica subito + ricontrolla ogni 60s. Ritorna il cleanup.
 * Da usare dentro un `$effect` del layout root.
 */
export function startNightModeEffect(): () => void {
  applyNightMode();
  const handle = setInterval(applyNightMode, 60_000);
  return () => clearInterval(handle);
}
