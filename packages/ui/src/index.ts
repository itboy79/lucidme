// @lucidme/ui — design system (token + componenti + i18n).
//
// Fonte unica di verità: prototipo Organico Generativo.
// Componenti in Svelte 5 (runes). Dipende da @lucidme/core per tipi dominio.

// Versione
export const UI_VERSION = '0.0.0';

// ---- Token (S1-1) ----
export {
  colors,
  emotionHues,
  extraColors,
  stageBackground,
  stageShadow,
} from './tokens/index.js';
export type { EmotionHueKey } from './tokens/index.js';
export { fontFamily, typography, googleFontsHref, fontSpec } from './tokens/index.js';
export { easings, durations, keyframeDurations, blobDelays } from './tokens/index.js';
export {
  radius,
  blobRadius,
  breatheMidRadius,
  emotionChipRadius,
  signRadius,
} from './tokens/index.js';

// ---- i18n (S1-2) ----
export { it, t } from './i18n/it.js';
export type { I18nKey, Dict } from './i18n/it.js';

// ---- Store toast (S1-2) ----
export { show as showToast, hide as hideToast, toastState, TOAST_DURATION_MS } from './stores/toast.svelte.js';

// ---- Componenti (S1-2) ----
// Re-export dei tipi prop via `typeof` non necessario: i consumer importano i
// componenti come moduli .svelte e SvelteKit risolve i tipi automaticamente.
export { default as Screen } from './components/Screen.svelte';
export { default as Nav } from './components/Nav.svelte';
export { default as Panel } from './components/Panel.svelte';
export { default as Button } from './components/Button.svelte';
export { default as EmotionPicker } from './components/EmotionPicker.svelte';
export { default as LucidityPicker } from './components/LucidityPicker.svelte';
export { default as Toast } from './components/Toast.svelte';
export { default as TextEntry } from './components/TextEntry.svelte';
export { default as TrendChart } from './components/TrendChart.svelte';
