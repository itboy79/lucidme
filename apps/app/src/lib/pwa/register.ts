import { registerSW } from 'virtual:pwa-register';

/**
 * Registra il service worker (registerType: 'prompt').
 * Non auto-aggiorna: chiede conferma all'utente (Toast in Step 1).
 * Per Step 0: logghiamo solo l'evento, nessuna UI.
 */
export function registerPWA(): void {
  if (typeof window === 'undefined') return;
  const updateSW = registerSW({
    onNeedRefresh() {
      // TODO Step 1: mostrare Toast "Nuova versione disponibile — aggiorna"
      console.warn('[PWA] nuova versione disponibile');
    },
    onOfflineReady() {
      console.warn('[PWA] pronto per uso offline');
    },
  });
  // esposto per trigger manuale dall'eventuale Toast futuro
  (window as unknown as { __lucidmeUpdateSW?: () => Promise<void> }).__lucidmeUpdateSW = updateSW;
}
