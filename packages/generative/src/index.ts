/**
 * @lucidme/generative — motore organismi/stelle generativi.
 *
 * Zero dipendenze esterne, zero accesso DOM globale. Il canvas arriva come
 * argomento. Stesso input → stesso output (timeMs è l'unica variabile di animazione).
 *
 * API pubblica (ticket S1-3):
 *   - renderFrame(ctx, params, x, y, size, timeMs)
 *   - toStaticSVG(params, size)
 *   - gardenLayout(seeds, w, h)
 *   - mulberry32 / hashStr / EMOTION_HUES / tipi
 */
export { mulberry32, hashStr } from './prng.js';
export {
  EMOTIONS,
  EMOTION_HUES,
  emotionHue,
} from './types.js';
export type { Emotion, Lucidity, OrganismParams } from './types.js';
export { renderFrame } from './render.js';
export { toStaticSVG } from './svg.js';
export { gardenLayout } from './layout.js';
export type { GardenNode, GardenPosition } from './layout.js';

export const GENERATIVE_VERSION = '0.0.0';
