/**
 * Tipi del motore sveglia (§S4-3).
 *
 * `AlarmBackend` è l'interfaccia astratta che separa la logica di scheduling
 * (`scheduler.ts`) dai backend concreti (nativo Capacitor / web PWA). Lo
 * scheduler è platform-agnostic e testabile con un mock.
 */

/** Opzioni di un allarme pianificato. */
export interface AlarmOptions {
  /** Path del suono custom (es. `/audio/alarms/marea.mp3`) o null. */
  sound?: string | null;
  /** Vibrazione on/off. */
  vibrate?: boolean;
  /** Titolo/body della notifica (visibile su nativo). */
  title?: string;
  body?: string;
}

/**
 * Backend di scheduling concreto. Implementato da `native.ts` (Capacitor) e
 * `web.ts` (PWA). Lo scheduler ci parla solo tramite questa interfaccia.
 */
export interface AlarmBackend {
  /** Pianifica un allarme `id` al tempo `at` con le opzioni date. */
  schedule(id: number, at: Date, opts?: AlarmOptions): Promise<void>;
  /** Cancella un allarme pianificato (no-op se non esiste). */
  cancel(id: number): Promise<void>;
  /** True se il backend è "affidabile" (nativo) o best-effort (web). */
  readonly reliable: boolean;
  /** Identificatore del backend per copy onesto (es. "native" / "web"). */
  readonly kind: 'native' | 'web';
}

/** ID di notifica fissi per le nostre sveglie (niente collisioni tra feature). */
export const ALARM_ID_WBTB = 1001;
export const ALARM_ID_RC_BASE = 2000; // reality check: 2000..2000+n

/**
 * Rileva la piattaforma. Import dinamico di `@capacitor/core` solo su nativo;
 * su web l'import non avviene mai → il bundle web non dipende da Capacitor.
 * Se `@capacitor/core` non è risolvibile (build web senza pacchetto), ritorna
 * false (siamo sul web).
 */
export async function isNative(): Promise<boolean> {
  try {
    const mod = (await import('@capacitor/core')) as {
      Capacitor?: { isNativePlatform: () => boolean };
    };
    return mod.Capacitor?.isNativePlatform() ?? false;
  } catch {
    // @capacitor/core non installato → siamo sul web (PWA).
    return false;
  }
}
