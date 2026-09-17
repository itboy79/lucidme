/**
 * Entitlements free/pro (ticket S8-1, parte 1).
 *
 * Modulo PURO: zero dipendenze, zero UI, zero side-effect. `FEATURE_MATRIX` è
 * l'unica fonte di verità per il gating delle feature in tutta l'app.
 *
 * Regola di prodotto inviolabile: E2E e export sempre free — la privacy non è
 * MAI a pagamento. Anche `journal` (diario + giardino) è illimitato su
 * entrambi i tier: local-first significa che i propri dati non si pagano.
 *
 * Le 3 suonerie sveglia bundled sono sempre free; `custom_sounds` gated solo
 * le custom. `path_full` gated il percorso giorni 8–21 + TLR (i giorni 1–7
 * sono free). `trend_long` gated i trend Lume oltre 4 settimane.
 */

/** Tier di abbonamento. */
export type Tier = 'free' | 'pro';

/** Feature gated. La lista è chiusa: estendere qui (e solo qui). */
export type Feature =
  | 'journal' // journal + giardino illimitati
  | 'export' // export JSON/MD
  | 'path_full' // percorso giorni 8–21 + TLR
  | 'trend_long' // Lume: trend > 4 settimane
  | 'custom_sounds' // suonerie sveglia custom (le 3 bundled sono sempre free)
  | 'sync_multi' // sync multi-device illimitato
  | 'e2e'; // cifratura E2E (privacy MAI a pagamento — sempre true)

/**
 * Matrice entitlement. Lookup puro, nessuna logica condizionale.
 * INVIOLABILE: `e2e` e `export` sono true su ogni tier.
 */
export const FEATURE_MATRIX: Readonly<Record<Feature, Readonly<Record<Tier, boolean>>>> = {
  journal: { free: true, pro: true },
  export: { free: true, pro: true },
  path_full: { free: false, pro: true },
  trend_long: { free: false, pro: true },
  custom_sounds: { free: false, pro: true },
  sync_multi: { free: false, pro: true },
  e2e: { free: true, pro: true },
};

/** Reality check al giorno per tier (engine RC, ticket S8-1). */
export const RC_DAILY_LIMIT: Readonly<Record<Tier, number>> = { free: 4, pro: 8 };

/**
 * Giorni del Sentiero accessibili al tier free: i giorni 1–PATH_FREE_DAYS
 * sono free, oltre è Pro (`path_full`). Fonte unica per il gating in UI
 * (evita magic number duplicati — review finding #11).
 */
export const PATH_FREE_DAYS = 7;

/** Il tier può usare la feature? Puro lookup nella matrice. */
export function can(feature: Feature, tier: Tier): boolean {
  return FEATURE_MATRIX[feature][tier];
}
