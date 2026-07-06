/**
 * onboarding.svelte.ts — store reattivo (rune Svelte 5) per il primo avvio.
 *
 * Mantiene un singolo flag `completed` letto dalla chiave SettingsRepo
 * `onboarding_completed`. Espone `ensureLoaded()` (caricamento lazy + idempotente)
 * e `markCompleted()` (persiste + aggiorna lo stato reattivo).
 *
 * Usato dal root guard (`+layout.svelte`) per decidere se reindirizzare a
 * `/onboarding` (se non completato) o a `/giardino` (se già completato e si
 * tenta di riaprire `/onboarding`).
 */
import { getDbClient } from '../db/client.svelte.js';

/** Chiave SettingsRepo per il flag di onboarding completato. */
const ONBOARDING_KEY = 'onboarding_completed';

class OnboardingStore {
  /** True dopo che il primo caricamento è andato a buon fine. */
  loaded = $state(false);
  /** True mentre una load è in corso. */
  loading = $state(false);
  /** True se l'utente ha già completato l'onboarding (o saltato). */
  completed = $state(false);
  private loadPromise: Promise<void> | null = null;

  ensureLoaded(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.refresh();
    return this.loadPromise;
  }

  /**
   * Ricarica il flag dal repo (sovrascrive lo stato locale). Best-effort: se il
   * backend SQLite non è inizializzabile (es. wasm non servito, contesto non
   * sicuro), restiamo su `completed=false`/`loaded=true` così l'UI può comunque
   * funzionare (onboarding mostrato, navigazione consentita).
   */
  async refresh(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    try {
      const { settingsRepo } = await getDbClient();
      const value = await settingsRepo.get<boolean>(ONBOARDING_KEY);
      this.completed = value === true;
    } catch {
      this.completed = false;
    } finally {
      this.loaded = true;
      this.loading = false;
    }
  }

  /**
   * Marca l'onboarding come completato: aggiorna lo stato reattivo SUBITO
   * (così il root guard non reindirizza di nuovo a /onboarding) e persiste
   * su SettingsRepo in best-effort. Se la persistenza fallisce — es. backend
   * wa-sqlite assente in test headless — lo stato locale resta `true` per
   * questa sessione; al prossimo avvio verrà riletto da DB.
   * Idempotente.
   */
  async markCompleted(): Promise<void> {
    this.completed = true;
    this.loaded = true;
    try {
      const { settingsRepo } = await getDbClient();
      await settingsRepo.set(ONBOARDING_KEY, true);
    } catch {
      /* persistenza best-effort: stato locale già aggiornato */
    }
  }
}

/** Istanza singleton importata dal layout radice e dalla route /onboarding. */
export const onboardingStore = new OnboardingStore();
