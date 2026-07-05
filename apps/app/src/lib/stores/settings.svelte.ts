/**
 * settings.svelte.ts — store reattivo per le impostazioni sonno (§S4-2) e
 * altri setting key-value.
 *
 * Modella le impostazioni sonno (ora-sonno, ora-sveglia, WBTB on/off, orario
 * WBTB, suoneria) come un oggetto sotto la chiave `sleep`, persistito via
 * `SettingsRepo`. Espone getter reattivi + validatori (WBTB tra sleepTime+2h e
 * wakeTime−30min).
 */
import { getDbClient } from '../db/client.svelte.js';

/** Suonerie disponibili (file NON bundled, solo path). */
export const ALARM_SOUNDS = ['marea', 'bosco', 'campana'] as const;
export type AlarmSound = (typeof ALARM_SOUNDS)[number];

/** Impostazioni sonno. */
export interface SleepSettings {
  /** Ora-sonno target 'HH:MM' (default 23:30). */
  sleepTime: string;
  /** Ora-sveglia 'HH:MM' (default 07:00). */
  wakeTime: string;
  /** WBTB attivo. */
  wbtbEnabled: boolean;
  /** Orario WBTB 'HH:MM' (default wakeTime − 2h). */
  wbtbTime: string;
  /** Suoneria scelta. */
  sound: AlarmSound;
}

export const SLEEP_DEFAULTS: SleepSettings = {
  sleepTime: '23:30',
  wakeTime: '07:00',
  wbtbEnabled: false,
  wbtbTime: '05:00',
  sound: 'marea',
};

/** Chiave settings per l'oggetto sleep. */
const SLEEP_KEY = 'sleep';

/** Converte 'HH:MM' in minuti da mezzanotte. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return ((h ?? 0) * 60 + (m ?? 0)) % (24 * 60);
}

/** Converte minuti da mezzanotte in 'HH:MM'. */
export function fromMinutes(min: number): string {
  const m = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Orario WBTB default = wakeTime − 2h. */
export function defaultWbtbTime(wakeTime: string): string {
  return fromMinutes(toMinutes(wakeTime) - 2 * 60);
}

/**
 * Valida WBTB: deve cadere tra sleepTime+2h e wakeTime−30min. Ritorna true se
 * valido. Gestisce il wrap-around notturno: se sleepTime > wakeTime (es. 23:30
 * → 07:00), la finestra "notte" attraversa mezzanotte.
 */
export function isWbtbValid(s: SleepSettings): boolean {
  const sleep = toMinutes(s.sleepTime);
  const wake = toMinutes(s.wakeTime);
  const wbtb = toMinutes(s.wbtbTime);
  // finestra: [sleep+120, wake-30]. Se wake < sleep (attraversa mezzanotte),
  // normalizziamo wake += 24*60 e wbtb += 24*60 se wbtb < sleep.
  let wakeN = wake;
  let wbtbN = wbtb;
  if (wake <= sleep) wakeN = wake + 24 * 60;
  if (wbtb <= sleep) wbtbN = wbtb + 24 * 60;
  const lo = sleep + 120; // sleepTime + 2h
  const hi = wakeN - 30; // wakeTime − 30min
  return wbtbN >= lo && wbtbN <= hi;
}

class SettingsStore {
  private sleep = $state<SleepSettings>(SLEEP_DEFAULTS);
  loaded = $state(false);
  loading = $state(false);
  private loadPromise: Promise<void> | null = null;

  get current(): SleepSettings {
    return this.sleep;
  }

  ensureLoaded(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.refresh();
    return this.loadPromise;
  }

  async refresh(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    try {
      const { settingsRepo } = await getDbClient();
      const stored = await settingsRepo.get<Partial<SleepSettings>>(SLEEP_KEY);
      this.sleep = { ...SLEEP_DEFAULTS, ...(stored ?? {}) };
      this.loaded = true;
    } finally {
      this.loading = false;
    }
  }

  /** Aggiorna (e persiste) le impostazioni sonno. Ritorna true se valide. */
  async save(next: SleepSettings): Promise<boolean> {
    if (!isWbtbValid(next)) return false;
    const { settingsRepo } = await getDbClient();
    await settingsRepo.set(SLEEP_KEY, next);
    this.sleep = next;
    return true;
  }

  /** Patch parziale (merge sui defaults + stato corrente). */
  async patch(partial: Partial<SleepSettings>): Promise<boolean> {
    const merged: SleepSettings = { ...this.sleep, ...partial };
    return this.save(merged);
  }
}

/** Singleton. */
export const settingsStore = new SettingsStore();
