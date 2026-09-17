/**
 * canvas.ts — sizing DPR-aware del canvas hero.
 *
 * Port minimale di `fitCanvas` dell'app (apps/app/src/lib/canvas.ts): qui
 * non serve l'observer (il canvas è full-viewport, basta il resize window).
 */

export interface CanvasSize {
  width: number;
  height: number;
}

/**
 * Ridimensiona il canvas al suo bounding box tenendo conto del
 * devicePixelRatio, e imposta il transform così il ctx lavora in px CSS.
 * Se il canvas non ha layout (0×0) restituisce zeri senza toccare lo store.
 */
export function fitCanvas(c: HTMLCanvasElement): CanvasSize {
  const rect = c.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(0, Math.floor(rect.width));
  const height = Math.max(0, Math.floor(rect.height));
  if (width === 0 || height === 0) return { width: 0, height: 0 };
  c.width = Math.floor(width * dpr);
  c.height = Math.floor(height * dpr);
  const ctx = c.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height };
}
