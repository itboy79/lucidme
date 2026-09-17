/**
 * Entità `Dream` (§8.3) + factory `createDream`.
 *
 * Pure: nessun import da DOM/DB. Le uniche dipendenze sono `ulid` (id) e
 * `hashStr` (seed). Tutta la validazione business vive qui dentro.
 *
 * Invarianti di dominio:
 * - `id` è un ULID, generato una sola volta in creazione.
 * - `seed` è immutabile dopo la creazione (§8.3 — l'organismo non cambia aspetto).
 * - `dreamedOn` è sempre `'YYYY-MM-DD'` (nessun orario).
 * - `title` ≤ 80 char (truncate con `…`); `body` ≤ 20_000 char (errore).
 * - Append-only + soft delete: nessuna cancellazione fisica (§5.1, §8.3).
 */
import { ulid } from './id.js';
import { seedHex } from '../crypto/hash.js';
import { isEmotion } from './emotion.js';
import type { Emotion } from './emotion.js';
import { DomainError } from './errors.js';

/** Livelli di lucidità validi (0..3). Indice in `LUCIDITY_LABELS`. */
export const LUCIDITY_LEVELS = [0, 1, 2, 3] as const;

export type Lucidity = (typeof LUCIDITY_LEVELS)[number];

/** Etichette italiane dei livelli di lucidità (indicizzate per `Lucidity`). */
export const LUCIDITY_LABELS = ['non lucido', 'barlume', 'lucido', 'pieno controllo'] as const;

/** Limite titolo: troncato con `…` se superato. */
export const TITLE_MAX = 80;
/** Limite body: superato → `DomainError('VALIDATION')`. */
export const BODY_MAX = 20_000;
/** Numero di parole del body usate come titolo fallback. */
export const TITLE_FALLBACK_WORDS = 6;

/**
 * Sogno. `seed` deriva da `id + createdAt` e NON va mai rigenerato.
 */
export interface Dream {
  id: string;
  createdAt: string; // ISO8601
  dreamedOn: string; // 'YYYY-MM-DD'
  title: string;
  body: string;
  emotion: Emotion;
  lucidity: Lucidity;
  /**
   * Entry "non ricordo il sogno" (S8-2): true = il sogno non è stato
   * ricordato al risveglio. In questo caso `body` può essere vuoto e
   * `lucidity` è forzata a 0.
   */
  noRecall: boolean;
  seed: string;
  deletedAt: string | null;
}

export interface CreateDreamInput {
  title?: string;
  body: string;
  emotion: Emotion;
  lucidity: Lucidity;
  noRecall?: boolean;
  dreamedOn?: string;
  createdAt?: string;
  id?: string;
}

/**
 * Factory di `Dream`. Valida e normalizza. Genera `id` (ULID) e `seed`.
 *
 * Regole (§S2-1, ticket step-02):
 * - body ≤ 20_000 char, altrimenti `DomainError('VALIDATION')`.
 * - title > 80 char → troncato a 80 + `…` (slice su codepoint via Array.from).
 * - title vuoto → prime `TITLE_FALLBACK_WORDS` parole del body + `…`.
 * - emotion deve essere in EMOTIONS; lucidity in 0..3.
 * - `dreamedOn` default = oggi (`YYYY-MM-DD`, timezone locale).
 * - `createdAt` default = now ISO8601.
 *
 * Regole noRecall (S8-2, "non ricordo il sogno"):
 * - `noRecall` default `false`.
 * - con `noRecall: true` il body PUÒ essere stringa vuota (si salta la
 *   validazione "body non-vuoto"; il limite BODY_MAX resta valido).
 * - con `noRecall: true` la `lucidity` è FORZATA a 0 (niente recall =
 *   niente lucidità), qualunque valore valido sia passato.
 * - `emotion` resta obbligatoria anche con noRecall (la palette emozione
 *   si sceglie anche al mattino senza ricordo).
 * - il `seed` è generato come al solito (deterministico, immutabile).
 */
export function createDream(input: CreateDreamInput): Dream {
  const { body, emotion, lucidity } = input;
  const noRecall = input.noRecall ?? false;

  // Body vuoto ammesso SOLO per entry noRecall (S8-2).
  if (typeof body !== 'string' || (!noRecall && body.length === 0)) {
    throw new DomainError('VALIDATION', 'body vuoto');
  }
  if (body.length > BODY_MAX) {
    throw new DomainError('VALIDATION', 'body supera il limite massimo');
  }
  if (!isEmotion(emotion)) {
    throw new DomainError('VALIDATION', 'emotion non valida');
  }
  if (!(lucidity in LUCIDITY_LABELS)) {
    throw new DomainError('VALIDATION', 'lucidity fuori range 0..3');
  }

  const createdAt = input.createdAt ?? new Date().toISOString();
  const id = input.id ?? ulid();
  const dreamedOn = input.dreamedOn ?? todayLocal();
  const title = resolveTitle(input.title, body);
  const seed = seedHex(id, createdAt);

  return {
    id,
    createdAt,
    dreamedOn,
    title,
    body,
    emotion,
    // Niente recall = niente lucidità: forzata a 0 (S8-2).
    lucidity: noRecall ? 0 : lucidity,
    noRecall,
    seed,
    deletedAt: null,
  };
}

/**
 * Seed puro di un sogno: hash esadecimale di `id + createdAt`.
 * Equivalente a `seedHex` ma con nome di dominio (per consumer che ricostruiscono
 * il seed da dati grezzi, es. import). Stesso output di `createDream().seed`.
 */
export function dreamSeed(id: string, createdAt: string): string {
  return seedHex(id, createdAt);
}

/**
 * Risolve il titolo secondo le regole: vuoto → fallback da body; lungo → troncato.
 * Internal. Esposta anche per test diretti.
 */
export function resolveTitle(rawTitle: string | undefined, body: string): string {
  const trimmed = (rawTitle ?? '').trim();
  if (trimmed.length === 0) {
    return firstWords(body, TITLE_FALLBACK_WORDS) + '…';
  }
  if (trimmed.length > TITLE_MAX) {
    // Tronca su codepoint (gestione emoji/grafi estesi) e aggiungi `…`.
    const chars = Array.from(trimmed);
    return chars.slice(0, TITLE_MAX).join('') + '…';
  }
  return trimmed;
}

/** Prime `n` parole di un testo (split su spazi). Internal/test. */
export function firstWords(text: string, n: number): string {
  return text.trim().split(/\s+/).slice(0, n).join(' ');
}

/** Data odierna in formato `YYYY-MM-DD` (timezone locale, non UTC). Internal. */
export function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
