/**
 * render.ts — port ESATTO di `drawOrganism` dal prototipo Organico Generativo
 * (righe 245-280 del file HTML).
 *
 * Firma: `renderFrame(ctx, p, x, y, size, timeMs)`.
 *   - ctx arriva come argomento (nessun accesso a DOM globale).
 *   - `p.seed` è la sola fonte di variazione; `timeMs` è l'unica variabile di animazione.
 *   - Stesso (seed, emotion, lucidity, size, timeMs) → pixel identici, sempre.
 *
 * ATTENZIONE: ogni ordine/numero di chiamate a `rnd()` è significativo (il
 * prototype consuma il PRNG in una sequenza precisa). Non riordinare.
 */
import { mulberry32, hashStr } from './prng.js';
import type { OrganismParams, Lucidity } from './types.js';
import { emotionHue } from './types.js';

/**
 * Disegna un organismo (fiore onirico) sul ctx dato.
 *
 * @param ctx     contesto 2D (già traslato/scalato dal chiamante per DPR).
 * @param p       parametri (seed, emotion, lucidity).
 * @param x       centro x in pixel CSS.
 * @param y       centro y in pixel CSS.
 * @param size    raggio base R (pixel CSS). Prototipo usa ~26..62.
 * @param timeMs  tempo di animazione (ms). 0 = snapshot statico.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  p: OrganismParams,
  x: number,
  y: number,
  size: number,
  timeMs: number,
): void {
  const cx = x;
  const cy = y;
  const R = size;
  const luc = p.lucidity as Lucidity;
  const hue = emotionHue(p.emotion);
  const time = timeMs;

  const rnd = mulberry32(hashStr(p.seed));
  const petals = 5 + Math.floor(rnd() * 7);
  const glow = 0.25 + luc * 0.25;
  // Nota: due chiamate rnd() aggiuntive consumate per rot/breathe (come nel prototipo).
  const rot = rnd() * Math.PI * 2 + time * 0.00012 * (rnd() > 0.5 ? 1 : -1);
  const breathe = 1 + Math.sin(time * 0.0011 + rnd() * 6) * 0.045;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(breathe, breathe);

  // aura
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.5);
  g.addColorStop(0, `hsla(${hue},80%,72%,${glow * 0.5})`);
  g.addColorStop(1, 'hsla(0,0%,0%,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.5, 0, 7);
  ctx.fill();

  // petals
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const len = R * (0.6 + rnd() * 0.4);
    const wid = R * (0.16 + rnd() * 0.14);
    const sway = Math.sin(time * 0.0016 + i * 1.7) * 0.09;
    ctx.save();
    ctx.rotate(a + sway);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(wid, len * 0.35, wid * 0.5, len * 0.85, 0, len);
    ctx.bezierCurveTo(-wid * 0.5, len * 0.85, -wid, len * 0.35, 0, 0);
    ctx.fillStyle = `hsla(${hue + (rnd() - 0.5) * 24},72%,${58 + luc * 7}%,${0.3 + luc * 0.14})`;
    ctx.fill();
    ctx.strokeStyle = `hsla(${hue},85%,80%,${0.35 + luc * 0.18})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // filament
    if (rnd() > 0.45) {
      ctx.beginPath();
      ctx.moveTo(0, len);
      ctx.quadraticCurveTo(wid * 0.6, len * 1.18, 0, len * 1.32);
      ctx.strokeStyle = `hsla(${hue},90%,85%,${0.3 + luc * 0.2})`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, len * 1.32, 1.6 + luc * 0.9, 0, 7);
      ctx.fillStyle = `hsla(${hue},95%,88%,${0.5 + luc * 0.15})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // core
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.16 + luc * 2, 0, 7);
  ctx.fillStyle = `hsla(${hue},95%,${80 + luc * 5}%,0.95)`;
  ctx.shadowColor = `hsla(${hue},95%,75%,0.9)`;
  ctx.shadowBlur = 10 + luc * 12;
  ctx.fill();

  ctx.restore();
}
