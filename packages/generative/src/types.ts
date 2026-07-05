/**
 * Tipi condivisi del motore generativo.
 *
 * Zero dipendenze esterne: definiamo qui una copia locale del tipo `Emotion`
 * (allineato a `@lucidme/core` EMOTIONS). Manteniamo la copia per non importare
 * core (vincolo "zero dipendenze esterne"); il test in `prng.test.ts` verifica
 * che le due liste rimangano sincronizzate.
 */

/**
 * Emozioni del sogno. Lista chiusa v1, identica a `@lucidme/core` EMOTIONS
 * e all'array `EMOS` del prototipo (righe 221-228).
 */
export const EMOTIONS = [
  'calma',
  'meraviglia',
  'gioia',
  'paura',
  'malinconia',
  'desiderio',
] as const;

export type Emotion = (typeof EMOTIONS)[number];

/**
 * Hue HSL per emozione — copiati dall'array `EMOS` del prototipo.
 * Usati da `renderFrame`/`toStaticSVG` per colorare l'organismo.
 */
export const EMOTION_HUES: Record<Emotion, number> = {
  calma: 172,
  meraviglia: 262,
  gioia: 36,
  paura: 295,
  malinconia: 215,
  desiderio: 330,
};

/** Livelli di lucidità validi (0..3), come `@lucidme/core` Lucidity. */
export type Lucidity = 0 | 1 | 2 | 3;

/** Parametri di un organismo generativo. `seed` è la sola fonte di variazione. */
export interface OrganismParams {
  /** Seed testuale (es. id+sogno). Stesso seed → stesso organismo, sempre. */
  seed: string;
  emotion: Emotion;
  lucidity: Lucidity;
}

/** Restituisce l'hue HSL per un'emozione (default calma se non riconosciuta). */
export function emotionHue(emotion: Emotion): number {
  return EMOTION_HUES[emotion];
}
