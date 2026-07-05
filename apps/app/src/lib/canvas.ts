/**
 * canvas.ts — helper per il sizing dei canvas (port di `fitCanvas` del prototipo,
 * riga 283) + un observer che ridimensiona su cambi di layout.
 *
 * DPR-aware: imposta width/height = rect * devicePixelRatio e setTransform
 * così il ctx lavora in pixel CSS. Sotto DPR mancante, defaults a 1.
 */

export interface CanvasSize {
  width: number;
  height: number;
}

/**
 * Ridimensiona il canvas al suo bounding box, tenendo conto del devicePixelRatio.
 * Restituisce le dimensioni in pixel CSS. Se il canvas non ha layout (0×0),
 * restituisce zeri senza toccare il backing store.
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

export interface ResizeHandle {
  /** Stacca l'observer e i listener. Idempotente. */
  disconnect: () => void;
}

/**
 * Osserva le dimensioni del canvas e chiama `onResize` (con il canvas come arg)
 * su ogni cambio. Combina ResizeObserver + window resize (cover per Safari<13.4
 * e controlli che appaiono/scompaiono). Ritorna un handle per lo stop.
 */
export function observeResize(
  c: HTMLCanvasElement,
  onResize: (c: HTMLCanvasElement) => void,
): ResizeHandle {
  let disconnected = false;
  const handler = (): void => {
    if (!disconnected) onResize(c);
  };

  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(handler);
    ro.observe(c);
  }
  window.addEventListener('resize', handler);

  return {
    disconnect: () => {
      if (disconnected) return;
      disconnected = true;
      if (ro) ro.disconnect();
      window.removeEventListener('resize', handler);
    },
  };
}
