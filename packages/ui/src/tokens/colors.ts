/**
 * Palette estratta ESATTAMENTE dal `:root` del prototipo Organico Generativo
 * (file: prototipo/lucidme-prototype-organico-generativo.html).
 *
 * Non reinventare: ogni valore è copiato byte per byte dal CSS del prototipo.
 * La scena di sfondo `#040408` è il colore del `<body>` esterno al phone-frame;
 * lo stage usa il radial-gradient in `stageBackground` (vedi `index.ts`).
 */

/** Colori base notturni (D-007 = Organico Generativo). */
export const colors = {
  /** Sfondo esterno del body nel prototipo (`body{background:#040408}`). */
  bodyBg: '#040408',

  /** `--bg0` — gradiente più scura (fondo scala del radial-gradient dello stage). */
  bg0: '#07070f',
  /** `--bg1` — gradiente intermedia. */
  bg1: '#0a0a14',
  /** `--bg2` — gradiente più chiara in alto (`120% 90% at 50% -10%`). */
  bg2: '#141430',

  /** `--ink` — testo principale. */
  ink: '#e8e6f2',
  /** `--ink-dim` — testo secondario (`.sub`, etichette soft). */
  inkDim: '#8b88a6',
  /** `--ink-faint` — eyebrow, label faint, moon idle. */
  inkFaint: '#565370',

  /** `--cyan` — accento primario (lume, nav attiva, slider, glow). */
  cyan: '#7fe7dc',
  /** `--violet` — accento secondario (italic h1, blob gradient A, gradient plant-btn). */
  violet: '#b69cff',
  /** `--amber` — accento notte / WBTB / rituali. */
  amber: '#ffc98a',
  /** `--rose` — accento alba / registrazione vocale. */
  rose: '#ff9ec6',
} as const;

/**
 * Hue HSL per ogni emozione (estratti dall'array `EMOS` del prototipo,
 * righe 221-228). Usati dal motore generativo e dall'EmotionPicker.
 * L'ordine è quello mostrato nel selettore Alba del prototipo.
 */
export const emotionHues = {
  calma: 172,
  meraviglia: 262,
  gioia: 36,
  paura: 295,
  malinconia: 215,
  desiderio: 330,
} as const;

export type EmotionHueKey = keyof typeof emotionHues;

/** Colore per la crema del titolo notte (inline style `#f4e9dc` nel prototipo). */
export const extraColors = {
  /** Colore h1 notte (inline `style="color:#f4e9dc"`). */
  notteTitle: '#f4e9dc',
  /** Eyebrow notte (inline `rgba(255,201,138,.55)`). */
  notteEyebrow: 'rgba(255,201,138,.55)',
  /** Sombra esterna dello stage (`0 0 0 10px #16162a`). */
  stageFrame: '#16162a',
} as const;
