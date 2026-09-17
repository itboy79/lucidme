/**
 * billing — export unico del provider attivo.
 *
 * Oggi: stub (nessun acquisto). Con l'account RevenueCat: sostituire con
 * `revenuecat-provider.js` mantenendo la stessa interfaccia.
 */
export { stubBilling as billing } from './stub-provider.js';
export type { BillingProvider, BillingResult, Plan } from './provider.js';
