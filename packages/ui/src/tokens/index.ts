/**
 * Barrel dei token del design system Lucid Me.
 * Fonte unica di verità: il prototipo Organico Generativo.
 *
 * I token sono anche proiettati come CSS custom properties (`--lm-*`) dallo
 * script `scripts/gen-tokens.mjs` → `src/tokens/tokens.css`.
 */
export { colors, emotionHues, extraColors } from './colors.js';
export type { EmotionHueKey } from './colors.js';
export { fontFamily, typography, googleFontsHref, fontSpec } from './typography.js';
export { easings, durations, keyframeDurations, blobDelays } from './motion.js';
export {
  radius,
  blobRadius,
  breatheMidRadius,
  emotionChipRadius,
  signRadius,
} from './radius.js';

import { colors } from './colors.js';

/**
 * Sfondo dello stage (phone-frame) — radial-gradient del prototipo (riga 19).
 * `radial-gradient(120% 90% at 50% -10%, var(--bg2) 0%, var(--bg1) 45%, var(--bg0) 100%)`.
 */
export const stageBackground =
  `radial-gradient(120% 90% at 50% -10%, ${colors.bg2} 0%, ${colors.bg1} 45%, ${colors.bg0} 100%)`;

/** Box-shadow esterna dello stage (`0 0 0 10px #16162a,0 0 90px rgba(126,120,255,.14)`). */
export const stageShadow = '0 0 0 10px #16162a, 0 0 90px rgba(126,120,255,.14)';
