/**
 * Emozioni del sogno (§8.3). Lista chiusa v1: l'UI di Alba presenta queste 6.
 * Ordine significativo per il selettore. Aggiungere qui per estendere (v2).
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

/** Type guard: riconosce una stringa come `Emotion` valida. */
export function isEmotion(value: unknown): value is Emotion {
  return typeof value === 'string' && (EMOTIONS as readonly string[]).includes(value);
}
