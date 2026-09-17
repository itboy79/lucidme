/**
 * stub-provider — provider billing finto (ticket S8-1, pre-account).
 *
 * Sempre `{ ok: false, reason: 'unavailable' }`: la UI mostra il toast
 * "acquisti non ancora attivi" (i18n `pro.non_disponibile`). Zero rete,
 * zero stato: serve a completare il flusso UI end-to-end e a tenere il
 * posto al provider RevenueCat reale (stessa interfaccia).
 *
 * Quando l'account RevenueCat sarà attivo: creare `revenuecat-provider.ts`,
 * sostituire l'export in `index` di questa cartella e null'altro cambia.
 */
import type { BillingProvider, BillingResult } from './provider.js';

const UNAVAILABLE: BillingResult = { ok: false, reason: 'unavailable' } as const;

export const stubBilling: BillingProvider = {
  async purchase(): Promise<BillingResult> {
    return UNAVAILABLE;
  },
  async restore(): Promise<BillingResult> {
    return UNAVAILABLE;
  },
};
