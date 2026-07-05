/**
 * night.svelte.ts — store reattivo (rune Svelte 5) per il rituale serale (§S4-1).
 *
 * Mantiene lo stato del rituale di OGGI in `$state`, lo carica dal `NightRepo`
 * e persiste ogni toggle immediatamente. Espone i tre toggle (mild/tlr/signs),
 * il setWbtbTime e `markTlrDone` (chiamato dal TLRPlayer a sessione ≥15 min).
 *
 * Il reset di mezzanotte è implicito: `getToday()` usa la data device, quindi
 * una nuova riga viene creata alla prima interazione del nuovo giorno solare.
 */
import type { NightRitual } from '@lucidme/db';
import { getDbClient } from '../db/client.svelte.js';

class NightStore {
  private ritual = $state<NightRitual | null>(null);
  loaded = $state(false);
  loading = $state(false);
  private loadPromise: Promise<void> | null = null;

  /** Getter reattivo: leggere sottoscrive agli aggiornamenti. */
  get today(): NightRitual | null {
    return this.ritual;
  }

  /** Defaults se il rituale non è ancora iniziato. */
  get mildDone(): boolean {
    return this.ritual?.mildDone ?? false;
  }
  get tlrDone(): boolean {
    return this.ritual?.tlrDone ?? false;
  }
  get signsDone(): boolean {
    return this.ritual?.signsDone ?? false;
  }
  get wbtbTime(): string | null {
    return this.ritual?.wbtbTime ?? null;
  }

  /** Primo caricamento (idempotente). */
  ensureLoaded(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.refresh();
    return this.loadPromise;
  }

  /** Ricarica dal repo. */
  async refresh(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    try {
      const { nightRepo } = await getDbClient();
      this.ritual = await nightRepo.getToday();
      this.loaded = true;
    } finally {
      this.loading = false;
    }
  }

  /** Toggle del gesto MILD (persistito immediatamente). */
  async toggleMild(): Promise<void> {
    const { nightRepo } = await getDbClient();
    this.ritual = await nightRepo.toggleMild();
  }

  /** Toggle del gesto TLR. */
  async toggleTlr(): Promise<void> {
    const { nightRepo } = await getDbClient();
    this.ritual = await nightRepo.toggleTlr();
  }

  /**
   * Marca `tlr_done = true` (chiamato dal TLRPlayer a sessione ≥15 min).
   * Imposta il flag SENZA toggle (sempre true dopo una sessione completata).
   */
  async markTlrDone(): Promise<void> {
    const { nightRepo } = await getDbClient();
    this.ritual = await nightRepo.upsert({ tlrDone: true });
  }

  /** Toggle del gesto "ripassa sign". */
  async toggleSigns(): Promise<void> {
    const { nightRepo } = await getDbClient();
    this.ritual = await nightRepo.toggleSigns();
  }

  /** Imposta l'orario WBTB per la notte. */
  async setWbtbTime(time: string | null): Promise<void> {
    const { nightRepo } = await getDbClient();
    this.ritual = await nightRepo.setWbtbTime(time);
  }
}

/** Singleton. */
export const nightStore = new NightStore();
