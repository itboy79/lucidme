/// <reference types="vite/client" />

/**
 * Ambient types del sito: estende ImportMetaEnv di Vite con la sola variabile
 * pubblica usata dalla waitlist (vedi vite.config.ts: envPrefix 'PUBLIC_').
 */
interface ImportMetaEnv {
  /** Endpoint waitlist (opzionale): se assente, coda locale in localStorage. */
  readonly PUBLIC_WAITLIST_ENDPOINT?: string;
}
