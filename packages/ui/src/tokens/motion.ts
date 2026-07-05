/**
 * Motion — duration + easing estratte dal CSS del prototipo Organico Generativo.
 *
 * Easing presenti (cubic-bezier):
 *   - `.screen`           transition: opacity .8s cubic-bezier(.4,0,.2,1)   ← "standard"
 *   - `.moon`, `.moon .orb`, `.emo`, `.ritual .dot` … transition: all .4s/.5s (linear-ish default, nessuna bezier esplicita → usiamo `.2,.6,.2,1` come ease organico del design system, già adottato in tokens.css Step 0)
 *   - `.plant-btn` / `.start-btn` / `.dev-smoke` transition: transform/box-shadow .3s (ease di default)
 *
 * Durate (ms):
 *   - .screen fade .8s
 *   - .toast in/out .5s
 *   - .moon / .orb .5s
 *   - .emo / .ritual .dot .4s
 *   - button press .3s
 *   - #detail overlay .6s
 *
 * Animazioni @keyframes (loop, non transizioni):
 *   - breathe 7s ease-in-out infinite (bordi blob)
 *   - fadePulse 5s ease-in-out infinite (garden-hint)
 *   - recPulse 4s ease-in-out infinite (rec-btn)
 */

export const easings = {
  /** `.screen` opacity fade — `cubic-bezier(.4,0,.2,1)` (Material "standard"). */
  standard: 'cubic-bezier(.4,0,.2,1)',
  /**
   * Ease organico del design system — `cubic-bezier(.2,.6,.2,1)`.
   * Già adottato in `tokens.css` Step 0 per transizioni soft di bottoni/nav.
   * Lo usiamo dove il prototipo ha `transition: all .Xs` senza bezier esplicita.
   */
  organic: 'cubic-bezier(.2,.6,.2,1)',
} as const;

/** Durate di transizione (ms), copiate dal prototipo. */
export const durations = {
  /** `.screen` opacity transition: `.8s`. */
  screenFade: 800,
  /** `#detail` overlay opacity: `.6s`. */
  detailFade: 600,
  /** `.toast` show/hide: `.5s`. */
  toastFade: 500,
  /** `.moon`, `.moon .orb`: `.5s`. */
  nav: 500,
  /** `.emo`, `.ritual .dot`: `.4s`. */
  chip: 400,
  /** `.plant-btn` / `.start-btn` / `.dev-smoke` active: `.3s`. */
  buttonPress: 300,
} as const;

/** Durate dei loop @keyframes (ms). */
export const keyframeDurations = {
  /** `@keyframes breathe` — 7s ease-in-out infinite. */
  breathe: 7000,
  /** `@keyframes fadePulse` (garden-hint) — 5s ease-in-out infinite. */
  fadePulse: 5000,
  /** `@keyframes recPulse` (rec-btn) — 4s ease-in-out infinite. */
  recPulse: 4000,
} as const;

/** Ritardi di animazione usati nelle varianti blob (`.blob.b2`/`.b3`). */
export const blobDelays = {
  b1: 0,
  /** `.blob.b2` — `animation-delay:-2.5s`. */
  b2: -2500,
  /** `.blob.b3` — `animation-delay:-4s`. */
  b3: -4000,
} as const;
