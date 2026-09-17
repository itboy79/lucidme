/**
 * entitlements.svelte.ts — store reattivo del tier utente (ticket S8-1).
 *
 * Il tier è persistito nel settings repo locale (chiave `tier`, default
 * 'free'). L'aggiornamento reale arriva dal provider billing (RevenueCat
 * quando l'account sarà attivo; oggi lo stub non sblocca nulla — vedi
 * `lib/billing/`).
 *
 * Pattern: singleton rune-based come gli altri store dell'app
 * (ensureLoaded lazy + idempotente, fallback silenzioso su DB assente).
 */
import { getDbClient } from '$lib/db/client.svelte.js';
import type { Tier } from '@lucidme/core';

/** Chiave SettingsRepo per il tier. */
const TIER_KEY = 'tier';

function isTier(v: unknown): v is Tier {
  return v === 'free' || v === 'pro';
}

class EntitlementStore {
  tier = $state<Tier>('free');
  loaded = $state(false);

  isPro = $derived(this.tier === 'pro');

  #loading: Promise<void> | null = null;
  /** True dopo un setTier: una lettura in-flight non deve sovrascriverlo. */
  #dirty = false;

  /** Carica il tier dal DB una sola volta (idempotente). */
  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.#loading ??= (async () => {
      try {
        const { settingsRepo } = await getDbClient();
        const stored = await settingsRepo.get<Tier>(TIER_KEY);
        // Race guard (review finding #4): se un setTier è arrivato mentre la
        // lettura era in-flight, la lettura stale NON deve tornare a free.
        if (!this.#dirty && isTier(stored)) this.tier = stored;
      } catch {
        // DB non disponibile (es. fallback in memoria): tier free, silenzioso.
      } finally {
        this.loaded = true;
      }
    })();
    await this.#loading;
  }

  /** Aggiorna e persiste il tier (chiamato dal provider billing). */
  async setTier(tier: Tier): Promise<void> {
    this.#dirty = true;
    this.tier = tier;
    this.loaded = true;
    this.#loading ??= Promise.resolve();
    try {
      const { settingsRepo } = await getDbClient();
      await settingsRepo.set(TIER_KEY, tier);
    } catch {
      // persistenza best-effort: lo stato in memoria è già aggiornato.
    }
  }
}

/** Istanza singleton importata dalle route che applicano gating. */
export const entitlementStore = new EntitlementStore();
