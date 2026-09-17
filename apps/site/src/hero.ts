/**
 * hero.ts — organismo generativo dietro l'hero (§ wiki 8.2, stile "alba").
 *
 * Parametri fissi come da brief: seed 'landing:hero', emotion 'meraviglia',
 * lucidity 2. Loop requestAnimationFrame come apps/app/.../alba/+page.svelte;
 * con `prefers-reduced-motion: reduce` disegna UN frame statico (timeMs 0) e
 * niente loop. Il determinismo è del motore: stesso seed → stesso organismo.
 */
import { renderFrame } from '@lucidme/generative';
import type { OrganismParams } from '@lucidme/generative';
import { fitCanvas } from './canvas';

const HERO_PARAMS: OrganismParams = {
  seed: 'landing:hero',
  emotion: 'meraviglia',
  lucidity: 2,
};

/** Centro-y dell'organismo in frazione dell'altezza del canvas. */
const CENTER_Y_RATIO = 0.34;
/** Raggio base: frazione del lato minore, clampato per mobile e desktop. */
const MIN_RADIUS = 90;
const MAX_RADIUS = 240;

/** Avvia il rendering dell'hero. Ritorna lo stop (disponibile per test/HMR). */
export function initHero(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let size = fitCanvas(canvas);
  let raf = 0;

  const paint = (timeMs: number): void => {
    if (size.width === 0 || size.height === 0) return;
    const radius = Math.max(
      MIN_RADIUS,
      Math.min(MAX_RADIUS, Math.min(size.width, size.height) * 0.26),
    );
    ctx.clearRect(0, 0, size.width, size.height);
    renderFrame(
      ctx,
      HERO_PARAMS,
      size.width / 2,
      size.height * CENTER_Y_RATIO,
      radius,
      timeMs,
    );
  };

  const loop = (time: number): void => {
    paint(time);
    raf = window.requestAnimationFrame(loop);
  };

  const applyMotion = (): void => {
    if (raf !== 0) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
    if (reduced.matches) {
      paint(0); // frame statico: niente animazione
      return;
    }
    raf = window.requestAnimationFrame(loop);
  };

  const onResize = (): void => {
    size = fitCanvas(canvas);
    // In reduced-motion non c'è loop: ridisegna subito lo snapshot statico.
    if (reduced.matches) paint(0);
  };

  const onMotionChange = (): void => applyMotion();

  window.addEventListener('resize', onResize);
  reduced.addEventListener('change', onMotionChange);
  applyMotion();

  return () => {
    if (raf !== 0) window.cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    reduced.removeEventListener('change', onMotionChange);
  };
}
