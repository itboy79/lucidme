/**
 * billing — astrazione provider pagamenti (ticket S8-1).
 *
 * L'interfaccia è l'unica cosa che l'app consuma: la route /pro e i trigger
 * di gating non sanno quale store/rete ci sia dietro.
 *
 * OGGI: `stub-provider.ts` (nessun acquisto possibile — RevenueCat richiede
 * account + chiavi store, vedi wiki 09 §2). DOMANI: `revenuecat-provider.ts`
 * implementerà la STESSA interfaccia (`@revenuecat/purchases-capacitor` sul
 * nativo, JS su web/Stripe) montandosi senza toccare la UI.
 */

/** Piani vendibili (un solo entitlement `pro`, D-005). */
export type Plan = 'monthly' | 'yearly';

/**
 * Esito operazione: ok → tier aggiornato; ko → reason utente-friendly.
 * `unavailable` = acquisti non attivi in questa build (stub / store offline).
 */
export type BillingResult = { ok: true; tier: 'pro' } | { ok: false; reason: 'unavailable' };

export interface BillingProvider {
  /** Avvia l'acquisto del piano (flusso nativo dello store). */
  purchase(plan: Plan): Promise<BillingResult>;
  /** Ripristina acquisti precedenti (stesso account store). */
  restore(): Promise<BillingResult>;
}
