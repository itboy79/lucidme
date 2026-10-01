/**
 * Backend sveglia nativo — Capacitor LocalNotifications (§S4-3).
 *
 * Importiamo i plugin Capacitor DINAMICAMENTE (`await import(...)`), così il
 * bundle web non include né dipende da `@capacitor/*`. Questo modulo è
 * caricato dal factory `index.ts` SOLO quando `isNative()` è true.
 *
 * Comportamenti:
 *  - Android: canale dedicato `lucidme-wbtb` con `importance: 5` (MAX) e
 *    `sound` custom. NON richiediamo bypassDnd né critical alerts (richiedono
 *    entitlement speciale Apple / permessi Google Play); è una limitazione
 *    documentata e onesta.
 *  - iOS: suono custom via `sound` (file nel bundle, max 30s → loop lato file).
 *    NO critical alerts (entitlement Apple); l'utente può comunque silenziare.
 *  - Volume ramp 0→100%: il sistema non espone ramp diretta; documentato come
 *    best-effort (su Android alcuni OEM lo fanno via `AudioManager`, non qui).
 *
 * Limitazioni oneste (copy `notte.pwa_limite` non qui, ma in UI):
 *  - se il device è in DND/silenzioso totale, Android MAX channel suona comunque
 *    ma iOS NO senza critical alert;
 *  - su Xiaomi/Samsung aggressivi la notifica può essere uccisa (vedi oem-hints).
 */
import type { AlarmBackend, AlarmOptions } from './types.js';

/** Canale Android dedicato (importance MAX). */
const CHANNEL_ID = 'lucidme-wbtb';

/** Crea il canale una sola volta (Android). Idempotente. */
async function ensureChannel(): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  try {
    await LocalNotifications.createChannel({
      channel: {
        id: CHANNEL_ID,
        name: 'Sveglia WBTB Vigilia',
        description: 'Sveglia per il risveglio nel mezzo della notte (WBTB).',
        importance: 5, // MAX
        visibility: 1, // public
        vibration: true,
        lights: true,
        lightColor: '#ffc98a',
      },
    });
  } catch {
    // iOS ignora createChannel; su Android può fallire se già esiste — no-op.
  }
}

export const nativeBackend: AlarmBackend = {
  kind: 'native',
  reliable: true,

  async schedule(id: number, at: Date, opts?: AlarmOptions): Promise<void> {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await ensureChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: opts?.title ?? 'Vigilia',
          body: opts?.body ?? 'È ora: svegliati con dolcezza.',
          schedule: { at },
          // sound custom: path relativo al bundle nativo (Capacitor serve i file
          // da `public/` convertiti. Qui passiamo il nome, il wiring dipende dalla
          // piattaforma: Android usa il canale sound, iOS usa `sound`.)
          sound: opts?.sound ?? null,
          channelId: CHANNEL_ID,
          extra: { wbtb: id === 1001 },
        },
      ],
    });
    // Vibrazione opzionale (in aggiunta al canale).
    if (opts?.vibrate) {
      try {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.impact({ style: 'SOFT' });
      } catch {
        // haptics non disponibile → best-effort
      }
    }
  },

  async cancel(id: number): Promise<void> {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: [{ id }] });
  },
};

/**
 * Listener per riavvio app: richedula dopo che l'app riparte. Il riavvio del
 * DEVICE è gestito dal sistema (le notifiche LocalNotifications pianificate
 * sopravvivono al reboot su entrambe le piattaforme). Esposto per l'hook
 * nell'app `+layout.svelte`.
 */
export async function onAppResume(cb: () => void): Promise<() => void> {
  try {
    const { App } = await import('@capacitor/app');
    const listener = await App.addListener('appStateChange', (state: { isActive: boolean }) => {
      if (state.isActive) cb();
    });
    return () => {
      void listener.remove();
    };
  } catch {
    // @capacitor/app non disponibile (web) → no-op cleanup.
    return () => undefined;
  }
}
