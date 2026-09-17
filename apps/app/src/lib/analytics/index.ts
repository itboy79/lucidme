/**
 * analytics — eventi anonimi, opt-in, lista CHIUSA (ticket S8-3).
 *
 * Regole di prodotto (approvate dal PM, vedi wiki 09/06):
 *  - DEFAULT OFF: nessun evento finché l'utente non attiva "Statistiche
 *    anonime" nelle impostazioni (privacy-first, §8.1 "opt-in").
 *  - Lista eventi FISSA (`AnalyticsEvent`): aggiunte = approvazione PM.
 *  - MAI contenuto dei sogni, MAI PII nelle props: solo boolean/numeri
 *    concordati (es. `lucidity: number`, `has_voice: boolean`).
 *  - posthog-js è caricato SOLO se `PUBLIC_POSTHOG_KEY` è presente nell'env
 *    (bundle invariato finché l'account non esiste) e solo dopo l'opt-in.
 *  - EU cloud di default (`https://eu.i.posthog.com`), niente autocapture,
 *    niente session recording, niente pageview automatici.
 *  - analytics non deve MAI rompere l'app: ogni fallimento è silenzioso.
 */

/** Lista CHIUSA degli eventi consentiti (S8-3). */
export type AnalyticsEvent =
  | 'app_opened'
  | 'dream_saved'
  | 'lesson_completed'
  | 'wbtb_scheduled'
  | 'wbtb_dismissed'
  | 'rc_answered'
  | 'paywall_viewed'
  | 'purchase_completed'
  | 'onboarding_completed'
  | 'export_used';

/** Stringhe CHIUSE ammesse nelle props (nessun testo libero: review S8). */
export type AnalyticsPropString = 'monthly' | 'yearly';

/** Props permesse: numeri, booleani e le sole stringhe chiuse sopra. */
export type AnalyticsProps = Record<string, number | boolean | AnalyticsPropString>;

const STORAGE_KEY = 'lucidme:analytics:enabled';

/** Env pubblica tipizzata localmente (evita `any` da import.meta.env). */
interface PublicEnv {
  PUBLIC_POSTHOG_KEY?: string;
  PUBLIC_POSTHOG_HOST?: string;
}

function readEnv(): PublicEnv {
  // In build SvelteKit inlinha i PUBLIC_* in import.meta.env; nei test node
  // (e in alcuni runtime) è process.env il canale affidabile: leggiamo entrambi.
  const fromMeta = (import.meta as unknown as { env?: PublicEnv }).env;
  const fromProcess =
    typeof process !== 'undefined' ? (process as unknown as { env?: PublicEnv }).env : undefined;
  return {
    PUBLIC_POSTHOG_KEY: fromMeta?.PUBLIC_POSTHOG_KEY ?? fromProcess?.PUBLIC_POSTHOG_KEY,
    PUBLIC_POSTHOG_HOST: fromMeta?.PUBLIC_POSTHOG_HOST ?? fromProcess?.PUBLIC_POSTHOG_HOST,
  };
}

function readEnabled(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // private mode / storage non disponibile: resta off.
    return false;
  }
}

// Stato del modulo: cache del flag + init posthog una sola volta (la promise
// memorizzata evita che due track() concorrenti eseguano entrambi init).
let enabled = readEnabled();
let initPromise: Promise<void> | null = null;

export function isAnalyticsEnabled(): boolean {
  return enabled;
}

export function setAnalyticsEnabled(value: boolean): void {
  enabled = value;
  try {
    if (typeof localStorage === 'undefined') return;
    if (value) {
      localStorage.setItem(STORAGE_KEY, '1');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // private mode: il flag resta in memoria per questa sessione.
  }
}

/**
 * Registra un evento. Fire-and-forget: i chiamanti usano `void track(...)`.
 * No-op (senza nemmeno importare posthog) se disattivato o senza chiave.
 */
export async function track(event: AnalyticsEvent, props?: AnalyticsProps): Promise<void> {
  if (!enabled) return;
  const env = readEnv();
  if (!env.PUBLIC_POSTHOG_KEY) return;
  try {
    const key = env.PUBLIC_POSTHOG_KEY;
    const host = env.PUBLIC_POSTHOG_HOST;
    // Init una volta sola: la promise è condivisa, i track() concorrenti
    // aspettano la stessa inizializzazione (nessun doppio init).
    initPromise ??= (async () => {
      const { default: posthog } = await import('posthog-js');
      posthog.init(key, {
        api_host: host ?? 'https://eu.i.posthog.com',
        autocapture: false,
        capture_pageview: false,
        disable_session_recording: true,
      });
    })();
    await initPromise;
    const { default: posthog } = await import('posthog-js');
    posthog.capture(event, props);
  } catch {
    // silenzioso: l'analytics non deve mai impattare l'UX.
  }
}
