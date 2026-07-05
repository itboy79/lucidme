/**
 * layout.ts — posizionamento deterministico degli organismi nel giardino.
 *
 * Port del `layoutGarden` del prototipo (righe 294-304): griglia a 3 colonne
 * con jitter derivato da `mulberry32(42)`. Stessa lista di input → stesso
 * layout, SEMPRE (test in `render.test.ts` lo verifica).
 *
 * Il seed del PRNG è fisso (42), NON derivato dai seed dei sogni: l'ordine della
 * lista determina la posizione. È voluto (specchia il prototipo) e rende il
 * layout stabile fintanto che l'ordine dei sogni è stabile.
 */
import { mulberry32 } from './prng.js';

export interface GardenNode {
  /** Seed testuale del sogno (passato a renderFrame). */
  seed: string;
  /** Lucidità 0..3 (influenza la size dell'organismo). */
  lucidity: number;
  /** Lunghezza del body (influenza la size, capped a 220 come nel prototipo). */
  bodyLen: number;
}

export interface GardenPosition {
  x: number;
  y: number;
  size: number;
}

/**
 * Calcola le posizioni degli organismi nel giardino.
 *
 * @param seeds lista (l'ordine conta: idx → col/row).
 * @param w     larghezza canvas (px CSS).
 * @param h     altezza canvas (px CSS).
 * @returns     array parallelo a `seeds` con {x, y, size}.
 */
export function gardenLayout(
  seeds: readonly GardenNode[],
  w: number,
  h: number,
): GardenPosition[] {
  // PRNG seeded fisso a 42 — IDENTICO al prototipo (`mulberry32(42)`).
  // Consumato in ordine: 2 chiamate rnd() per nodo (x-jitter, y-jitter).
  const rnd = mulberry32(42);

  return seeds.map((d, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = ((col + 0.5) / 3) * w + (rnd() - 0.5) * 34;
    const y = ((row + 0.55) / 3.3) * h + (rnd() - 0.5) * 30;
    const size = 26 + d.lucidity * 7 + Math.min(d.bodyLen, 220) * 0.03;
    return { x, y, size };
  });
}
