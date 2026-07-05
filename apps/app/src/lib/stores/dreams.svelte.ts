/**
 * dreams.svelte.ts — store reattivo (rune Svelte 5) per la lista dei sogni.
 *
 * Carica `listAll()` dal `DreamRepo` e tiene una copia reattiva (`$state`).
 * Espone `refresh()`, `add(dream)`, `remove(id)` (soft delete ottimistica) e
 * il getter reattivo `list`.
 *
 * Il caricamento è lazy: chiama `ensureLoaded()` (o leggi `list`) per far
 * partire la prima query. Le scritture sono ottimistiche (aggiornano subito lo
 * stato locale) e dopo la chiamata al repo.
 */
import type { Dream } from '@lucidme/core';
import { getDbClient } from '../db/client.svelte.js';

class DreamsStore {
  /** Lista reattiva dei sogni (non-deleted), dreamedOn DESC. */
  private items = $state<Dream[]>([]);
  /** True dopo il primo caricamento andato a buon fine. */
  loaded = $state(false);
  /** True mentre una load è in corso. */
  loading = $state(false);
  private loadPromise: Promise<void> | null = null;

  /** Getter reattivo: leggere questo valore sottoscrive agli aggiornamenti. */
  get list(): Dream[] {
    return this.items;
  }

  /**
   * Avvia il primo caricamento se non già fatto. Idempotente: chiamate
   * concorrenti condividono la stessa Promise.
   */
  ensureLoaded(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.refresh();
    return this.loadPromise;
  }

  /** Ricarica la lista dal repo (sovrascrive lo stato locale). */
  async refresh(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    try {
      const { dreamRepo } = await getDbClient();
      const all = await dreamRepo.listAll();
      this.items = all;
      this.loaded = true;
    } finally {
      this.loading = false;
    }
  }

  /** Aggiunge un sogno allo stato locale (in testa, ordinato dreamedOn DESC). */
  add(dream: Dream): void {
    this.items = mergeSorted([dream], this.items);
  }

  /**
   * Sostituisce un sogno (in edit mode) o lo aggiunge se non presente.
   * Mantieni ordinamento dreamedOn DESC.
   */
  upsert(dream: Dream): void {
    const without = this.items.filter((d) => d.id !== dream.id);
    this.items = mergeSorted([dream], without);
  }

  /** Rimuove un sogno dalla vista locale (soft delete). */
  remove(id: string): void {
    this.items = this.items.filter((d) => d.id !== id);
  }

  /** Reinserisce un sogno rimosso (undo del soft delete). */
  restore(dream: Dream): void {
    this.items = mergeSorted([dream], this.items);
  }
}

/**
 * Fonde due liste (già ordinate dreamedOn DESC) preservando l'ordine.
 * Stabile e O(n+m). Usa la data come chiave; a parità di data l'ordine è
 * quello di inserimento (il nuovo sogno compare prima).
 */
function mergeSorted(a: Dream[], b: Dream[]): Dream[] {
  const out: Dream[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const ai = a[i];
    const bj = b[j];
    if (ai && bj && ai.dreamedOn >= bj.dreamedOn) {
      out.push(ai);
      i++;
    } else if (bj) {
      out.push(bj);
      j++;
    }
  }
  while (i < a.length) {
    const x = a[i];
    if (x) out.push(x);
    i++;
  }
  while (j < b.length) {
    const x = b[j];
    if (x) out.push(x);
    j++;
  }
  return out;
}

/** Istanza singleton importata dai componenti dell'app. */
export const dreamsStore = new DreamsStore();
