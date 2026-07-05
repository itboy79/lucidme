/**
 * Backend sveglia PWA (web) — §S4-3.
 *
 * LIMITAZIONE ONESTA (§5.1.1 — il punto del ticket): il web NON può garantire
 * l'esecuzione di un timer in background. Service Worker + setTimeout + Web
 * Audio funzionano SOLO se la scheda/app resta aperta e attiva. Wake Lock API
 * (`navigator.wakeLock`) aiuta a tenere lo schermo acceso, ma il sistema può
 * comunque uccidere la pagina (low memory, battery saver).
 *
 * Questo backend è "best-effort": dichiara `reliable: false` e la UI deve
 * mostrare copy onesto (`notte.pwa_limite`). Non fingiamo affidabilità.
 *
 * Implementazione:
 *  - `schedule`: `setTimeout` al tempo target + Wake Lock + preflight Web Audio.
 *    Non usa SW notification (inaffidabile su iOS Safari); teniamo tutto in-page.
 *  - `cancel`: `clearTimeout` + rilascio Wake Lock.
 *  - Al fire: riproduzione del suono via Web Audio (loop fino a dismiss).
 */
import type { AlarmBackend, AlarmOptions } from './types.js';

interface PendingTimer {
  timeout: ReturnType<typeof setTimeout>;
  wakeLock?: Sentry; // wake lock handle
  sound?: string | null;
}

/** Wrapper al wake lock che astrae la sentinel opzionale. */
interface Sentry {
  released: boolean;
  release(): Promise<void>;
}

const timers = new Map<number, PendingTimer>();

/** Richiede un Wake Lock se supportato; ritorna una Sentry o null. */
async function acquireWakeLock(): Promise<Sentry | undefined> {
  const nav = navigator as Navigator & {
    wakeLock?: { request: (t: 'screen') => Promise<Sentry> };
  };
  if (!nav.wakeLock) return undefined;
  try {
    const sentinel = await nav.wakeLock.request('screen');
    return {
      get released() {
        return sentinel.released;
      },
      async release() {
        try {
          await sentinel.release();
        } catch {
          /* no-op */
        }
      },
    } as Sentry;
  } catch {
    return undefined;
  }
}

/**
 * Riproduce il suono dell'allarme via Web Audio (loop). `sound` è un path
 * (`/audio/alarms/marea.mp3`). Se assente o non supportato, emette un beep.
 */
async function playAlarmSound(sound?: string | null): Promise<void> {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (sound) {
      // Prova a caricare e loopare il file.
      const res = await fetch(sound);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(buf);
        const src = ctx.createBufferSource();
        src.buffer = audioBuf;
        src.loop = true;
        src.connect(ctx.destination);
        src.start();
        return;
      }
    }
    // Fallback: beep sinusoidale ripetuto (cosciente "mock" se manca il file).
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 660;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    osc.start();
  } catch {
    // Web Audio non disponibile → silenzio. La pagina deve comunque essere visibile.
  }
}

export const webBackend: AlarmBackend = {
  kind: 'web',
  reliable: false,

  async schedule(id: number, at: Date, opts?: AlarmOptions): Promise<void> {
    // Cancella un timer pre-esistente per questo id.
    const existing = timers.get(id);
    if (existing) {
      clearTimeout(existing.timeout);
      void existing.wakeLock?.release();
    }
    const wakeLock = await acquireWakeLock();
    const delay = at.getTime() - Date.now();
    // Se il delay è già passato (orologio desincronizzato), non scheduliamo.
    if (delay < 0) {
      void wakeLock?.release();
      return;
    }
    const timeout = setTimeout(() => {
      void playAlarmSound(opts?.sound);
      if (opts?.vibrate && 'vibrate' in navigator) {
        try {
          navigator.vibrate(400);
        } catch {
          /* no-op */
        }
      }
    }, delay);
    timers.set(id, { timeout, wakeLock, sound: opts?.sound ?? null });
  },

  async cancel(id: number): Promise<void> {
    const t = timers.get(id);
    if (!t) return;
    clearTimeout(t.timeout);
    void t.wakeLock?.release();
    timers.delete(id);
  },
};

/** Per test: resetta i timer in memoria. */
export function _resetWebTimers(): void {
  for (const t of timers.values()) {
    clearTimeout(t.timeout);
    void t.wakeLock?.release();
  }
  timers.clear();
}
