/**
 * border-radius estratti dal prototipo Organico Generativo.
 *
 * Il protagonista è il radius asimmetrico "blob" del `.blob` (con le sue
 * varianti `.b2`/`.b3`) e il `@keyframes breathe` che lo anima.
 * Copiati ESATTAMENTE dal CSS del prototipo (righe 35-38).
 */

export const radius = {
  /** `.plant-btn` — `border-radius:60px`. */
  pill: '60px',
  /** `.start-btn` — `border-radius:50px`. */
  pillSm: '50px',
  /** `.toast` — `border-radius:50px` (stesso di start-btn). */
  toast: '50px',
  /** Moon orb / cerchi vari — `border-radius:50%`. */
  circle: '50%',
  /** Stage phone-frame — `border-radius:44px` (solo phone-frame, non usato nei componenti). */
  stage: '44px',
} as const;

/**
 * Radius asimmetrici "blob". Copiati letteralmente dal prototipo:
 *   .blob    → 58% 42% 55% 45% / 48% 56% 44% 52%
 *   .blob.b2 → 44% 56% 48% 52% / 55% 45% 58% 42%
 *   .blob.b3 → 52% 48% 60% 40% / 42% 58% 46% 54%
 */
export const blobRadius = {
  /** `.blob` (b1, default). */
  b1: '58% 42% 55% 45% / 48% 56% 44% 52%',
  /** `.blob.b2`. */
  b2: '44% 56% 48% 52% / 55% 45% 58% 42%',
  /** `.blob.b3`. */
  b3: '52% 48% 60% 40% / 42% 58% 46% 54%',
} as const;

/**
 * Keypframe `breathe` (valore target al 50%).
 *   0%,100% → 58% 42% 55% 45% / 48% 56% 44% 52%   (= blobRadius.b1)
 *   50%     → 45% 55% 47% 53% / 56% 44% 57% 43%
 */
export const breatheMidRadius = '45% 55% 47% 53% / 56% 44% 57% 43%';

/**
 * Radius delle chip emozione (`.emo`) — `40% 60% 55% 45%/60% 40% 60% 40%`.
 * Copiato dal CSS del prototipo (riga 59).
 */
export const emotionChipRadius = '40% 60% 55% 45% / 60% 40% 60% 40%';

/** Radius dei "sign" (`.sign`) — `55% 45% 60% 40%/45% 60% 40% 55%` (riga 94). */
export const signRadius = '55% 45% 60% 40% / 45% 60% 40% 55%';
