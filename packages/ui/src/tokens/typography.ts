/**
 * Tipografia estratta dal prototipo Organico Generativo.
 *
 * Font caricati dal `<link>` Google Fonts in `<head>` del prototipo:
 *   Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..500
 *   Outfit:wght@300..600
 *
 * Pesi/size usati nel CSS del prototipo (cfr. regole `.eyebrow`, `h1`, `.sub`,
 * `.moon`, `.field-label`, `.plant-btn`, `.big-metric`, `.wbtb .time`, ecc.).
 */

/** Famiglie. I nomi sono i letterali del `:root` del prototipo. */
export const fontFamily = {
  /** `--serif:'Fraunces',serif` — titoli (h1), metriche grandi, WBTB time. */
  serif: "'Fraunces', serif",
  /** `--sans:'Outfit',sans-serif` — body, eyebrow, button, nav. */
  sans: "'Outfit', sans-serif",
} as const;

/**
 * Scala tipografica e pesi, copiati dal CSS del prototipo.
 * Ogni voce riporta il selettore di provenienza come riferimento.
 */
export const typography = {
  // h1 — `font-family:var(--serif); font-weight:340; font-size:34px; line-height:1.12`
  h1: { family: fontFamily.serif, weight: 340, sizePx: 34, lineHeight: 1.12 },
  // h1 em — italic violet (font-style gestito in componente)
  // .sub — `color:var(--ink-dim); font-size:14px; font-weight:300; line-height:1.5`
  sub: { family: fontFamily.sans, weight: 300, sizePx: 14, lineHeight: 1.5 },
  // .eyebrow — `font-size:11px; letter-spacing:.28em; text-transform:uppercase`
  eyebrow: { family: fontFamily.sans, weight: 400, sizePx: 11, letterSpacingEm: 0.28 },
  // .field-label — `font-size:11px; letter-spacing:.22em; text-transform:uppercase`
  fieldLabel: { family: fontFamily.sans, weight: 400, sizePx: 11, letterSpacingEm: 0.22 },
  // .rec-label — `font-size:12px; letter-spacing:.18em; text-transform:uppercase`
  recLabel: { family: fontFamily.sans, weight: 400, sizePx: 12, letterSpacingEm: 0.18 },
  // .moon — `font-size:9.5px; letter-spacing:.14em; text-transform:uppercase`
  moon: { family: fontFamily.sans, weight: 400, sizePx: 9.5, letterSpacingEm: 0.14 },
  // .emo (chip emozione) — `font-size:13px`
  emo: { family: fontFamily.sans, weight: 400, sizePx: 13 },
  // .luc-scale — `font-size:10.5px`
  lucScale: { family: fontFamily.sans, weight: 400, sizePx: 10.5 },
  // .plant-btn — `font-weight:600; font-size:15px; letter-spacing:.06em`
  plantBtn: { family: fontFamily.sans, weight: 600, sizePx: 15, letterSpacingEm: 0.06 },
  // .start-btn — `font-size:13px; letter-spacing:.08em`
  startBtn: { family: fontFamily.sans, weight: 400, sizePx: 13, letterSpacingEm: 0.08 },
  // .today-card .t — `font-family:var(--serif); font-size:19px; font-weight:400`
  todayCardT: { family: fontFamily.serif, weight: 400, sizePx: 19 },
  // .today-card .d — `font-size:13px; line-height:1.55; font-weight:300`
  todayCardD: { family: fontFamily.sans, weight: 300, sizePx: 13, lineHeight: 1.55 },
  // .ritual .rt — `font-size:14.5px`
  ritualRt: { family: fontFamily.sans, weight: 400, sizePx: 14.5 },
  // .ritual .rs — `font-size:11.5px`
  ritualRs: { family: fontFamily.sans, weight: 400, sizePx: 11.5 },
  // .wbtb .time — `font-family:var(--serif); font-size:52px; font-weight:300; letter-spacing:.02em`
  wbtbTime: { family: fontFamily.serif, weight: 300, sizePx: 52, letterSpacingEm: 0.02 },
  // .wbtb .lbl — `font-size:11px; letter-spacing:.26em; text-transform:uppercase`
  wbtbLbl: { family: fontFamily.sans, weight: 400, sizePx: 11, letterSpacingEm: 0.26 },
  // .big-metric .n — `font-family:var(--serif); font-size:74px; font-weight:300; line-height:1`
  bigMetricN: { family: fontFamily.serif, weight: 300, sizePx: 74, lineHeight: 1 },
  // .big-metric .u — `font-size:13px; line-height:1.4`
  bigMetricU: { family: fontFamily.sans, weight: 400, sizePx: 13, lineHeight: 1.4 },
  // .trend — `font-size:12.5px`
  trend: { family: fontFamily.sans, weight: 400, sizePx: 12.5 },
  // .sign — `font-size:12.5px`
  sign: { family: fontFamily.sans, weight: 400, sizePx: 12.5 },
  // .mini .n — `font-family:var(--serif); font-size:30px; font-weight:340`
  miniN: { family: fontFamily.serif, weight: 340, sizePx: 30 },
  // .mini .l — `font-size:10.5px; letter-spacing:.14em; text-transform:uppercase`
  miniL: { family: fontFamily.sans, weight: 400, sizePx: 10.5, letterSpacingEm: 0.14 },
  // .garden-hint — `font-size:11.5px; letter-spacing:.14em`
  gardenHint: { family: fontFamily.sans, weight: 400, sizePx: 11.5, letterSpacingEm: 0.14 },
  // detail #dTitle — `font-family:var(--serif); font-size:27px; font-weight:340`
  dTitle: { family: fontFamily.serif, weight: 340, sizePx: 27 },
  // detail #dBody — `font-size:15px; font-weight:300; line-height:1.75`
  dBody: { family: fontFamily.sans, weight: 300, sizePx: 15, lineHeight: 1.75 },
  // .toast — `font-size:13px`
  toast: { family: fontFamily.sans, weight: 400, sizePx: 13 },
} as const;

/**
 * URL Google Fonts del prototipo (per il `<link>` in layout).
 * Copiato letteralmente dall'`<head>` del prototipo.
 */
export const googleFontsHref =
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..500&family=Outfit:wght@300..600&display=swap';

/** Pesi (Outfit) e range opsz (Fraunces) effettivamente richiesti dal prototipo. */
export const fontSpec = {
  // Fraunces: axis ital (0/1), opsz 9..144, weight 300..600 (upright) e 300..500 (italic).
  fraunces: { upright: '300..600', italic: '300..500', opsz: '9..144' },
  // Outfit: weight 300..600.
  outfit: { weight: '300..600' },
} as const;
