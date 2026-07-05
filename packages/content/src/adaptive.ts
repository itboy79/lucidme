/**
 * Logica adattiva v1 (§S3-5).
 *
 * Regola ESATTA (nessuna variazione), dal ticket:
 *  - Al completamento del **giorno 7**, se `recallScore` (ultimi 7 giorni) < 40
 *    e `existingExtras` < 2 → inserisci `recall-01` come giorno **7.5**.
 *  - Al completamento del **giorno 14**, se `recallScore` ancora < 40 e
 *    `existingExtras` < 2 → inserisci `recall-02` come giorno **14.5**.
 *  - Massimo **2 extra** totali nel percorso.
 *
 * Feature flag `ADAPTIVE_ENABLED = false` di default: il recall score arriva
 * dallo Step 6 (Lume), non ancora costruito. Fino ad allora la UI non chiama
 * questa logica.
 */

/**
 * Feature flag globale. `false` finché lo Step 6 non fornisce il recall score.
 * Quando diventerà `true`, la UI inizierà a consultare `shouldInsertRecallExtra`.
 */
export const ADAPTIVE_ENABLED = false;

/** Soglia di recall score sotto la quale si inserisce un extra (def. Step 6). */
export const RECALL_SCORE_THRESHOLD = 40;

export interface AdaptiveInput {
  /** Giorno appena completato (1..21). */
  completedDay: number;
  /** Recall score degli ultimi 7 giorni (0..100, definizione Step 6). */
  recallScore: number;
  /** Quanti extra sono già stati inseriti nel percorso (0, 1 o 2). */
  existingExtras: number;
}

export interface AdaptiveDecision {
  /** True se va inserito un extra adesso. */
  insert: boolean;
  /** Giorno-frazione della lezione extra da inserire (7.5 o 14.5), o null. */
  lessonDay: number | null;
}

/**
 * Decide se inserire una lezione extra di recall. Implementazione fedele alla
 * regola del ticket, indipendente dal feature flag (è il chiamante che deve
 * rispettare `ADAPTIVE_ENABLED`; qui la logica è pura e testabile).
 */
export function shouldInsertRecallExtra(input: AdaptiveInput): AdaptiveDecision {
  const { completedDay, recallScore, existingExtras } = input;

  // Capienza massima raggiunta: mai oltre 2 extra.
  if (existingExtras >= 2) {
    return { insert: false, lessonDay: null };
  }

  // Solo al completamento dei giorni "di soglia" 7 e 14 si valuta l'inserimento.
  if (completedDay !== 7 && completedDay !== 14) {
    return { insert: false, lessonDay: null };
  }

  // Solo se il recall score è sotto soglia.
  if (recallScore >= RECALL_SCORE_THRESHOLD) {
    return { insert: false, lessonDay: null };
  }

  // Giorno 7 → recall-01 (7.5). Giorno 14 → recall-02 (14.5).
  const lessonDay = completedDay === 7 ? 7.5 : 14.5;
  return { insert: true, lessonDay };
}
