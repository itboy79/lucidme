/**
 * Dream sign detection v1 (§S2-1).
 *
 * Algoritmo ESATTO (non cambiarlo senza bumpare la cache dei sign esistenti):
 * 1. tokenizza il `body` con `/[\p{L}]+/gu` (solo lettere, gestisce accenti);
 * 2. lowercase;
 * 3. scarta i token nella stopword list italiana (lemmatizzazione NO, v1);
 * 4. conta le occorrenze su TUTTI i sogni non-deleted;
 * 5. filtra count >= threshold (default 3);
 * 6. ordina per count desc, poi alfabeticamente (tie-break deterministico);
 * 7. prende i primi `top` (default 10).
 *
 * Non tocca `body`/`title` se non per leggere: nessun leak possibile qui.
 */
import type { Dream } from '../domain/dream.js';
import { STOPWORDS_IT } from './stopwords-it.js';

export interface SignHit {
  label: string;
  count: number;
}

export interface DetectSignsOptions {
  /** Soglia minima di occorrenze per considerare un token un sign. Default 3. */
  threshold?: number;
  /** Numero massimo di sign restituiti. Default 10. */
  top?: number;
}

const WORD_RE = /[\p{L}]+/gu;

/** Estrae i token (lowercase, non-stopword) dal `body`. Esposto per test. */
export function tokenize(body: string): string[] {
  const out: string[] = [];
  const matches = body.toLowerCase().matchAll(WORD_RE);
  for (const m of matches) {
    const w = m[0];
    if (w && !STOPWORDS_IT.has(w)) out.push(w);
  }
  return out;
}

/**
 * Rileva i sign ricorrenti su un set di sogni. I sogni soft-deleted sono
 * esclusi dal conteggio (i loro segni non sono più "ricorrenti attivi").
 */
export function detectSigns(
  dreams: readonly Dream[],
  opts: DetectSignsOptions = {},
): SignHit[] {
  const threshold = opts.threshold ?? 3;
  const top = opts.top ?? 10;

  const counts = new Map<string, number>();
  for (const d of dreams) {
    if (d.deletedAt) continue; // soft-deleted: non conta
    for (const w of tokenize(d.body)) {
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .filter(([, c]) => c >= threshold)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label))
    .slice(0, top);
}
