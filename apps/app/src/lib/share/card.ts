/**
 * Share card (Step 6 — S6-3).
 * Genera un PNG 1080×1920 con: organismo del sogno + lucidity rate + wordmark.
 *
 * REGOLA §S6-3: MAI il testo del sogno. La funzione legge SOLO
 * { seed, emotion, lucidity } dal parametro organism — mai body/title.
 */

import { renderFrame, type OrganismParams } from '@lucidme/generative';

export interface ShareCardInput {
  organism: OrganismParams;
  lucidityRate: number;
  streak?: number;
}

const W = 1080;
const H = 1920;

/**
 * Genera un PNG 1080×1920 tramite canvas offscreen.
 * Disegna: sfondo radial-gradient notte, organismo (renderFrame), lucidity rate
 * (serif grande), wordmark "Vigilia" in basso.
 *
 * Privacy: l'unico input testuale è `lucidityRate` (numero) — nessun testo del sogno.
 */
export async function generateShareCard(input: ShareCardInput): Promise<Blob> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d non disponibile');

  // Sfondo: radial gradient notte profonda (palette Organico Generativo).
  const bg = ctx.createRadialGradient(W / 2, H * 0.1, 0, W / 2, H * 0.5, H);
  bg.addColorStop(0, '#141430');
  bg.addColorStop(0.45, '#0a0a14');
  bg.addColorStop(1, '#07070f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Organismo al centro: renderFrame usa timeMs=0 per snapshot statica.
  // Lo snapshotted due volte (rotazione leggermente diversa) per dare profondità.
  ctx.save();
  ctx.translate(W / 2, H * 0.42);
  renderFrame(ctx, input.organism, 0, 0, 220, 0);
  ctx.restore();

  // Lucidity rate — numero grande, gradient text cyan→violet.
  const rateText = input.lucidityRate.toLocaleString('it-IT', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  ctx.font = '300 240px Fraunces, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const grad = ctx.createLinearGradient(W * 0.25, 0, W * 0.75, 0);
  grad.addColorStop(0, '#7fe7dc');
  grad.addColorStop(1, '#b69cff');
  ctx.fillStyle = grad;
  ctx.fillText(rateText, W / 2, H * 0.72);

  // Etichetta sotto il numero.
  ctx.font = '300 36px Outfit, system-ui, sans-serif';
  ctx.fillStyle = '#8b88a6';
  ctx.fillText('sogni lucidi a settimana', W / 2, H * 0.78);

  // Streak opzionale.
  if (input.streak !== undefined && input.streak > 0) {
    ctx.font = '300 30px Outfit, system-ui, sans-serif';
    ctx.fillStyle = '#565370';
    ctx.fillText(`${input.streak} notti di fila`, W / 2, H * 0.82);
  }

  // Wordmark in basso.
  ctx.font = '340 48px Fraunces, Georgia, serif';
  ctx.fillStyle = '#e8e6f2';
  ctx.fillText('Vigilia', W / 2, H * 0.93);

  const blob = await canvasToBlob(canvas);
  return blob;
}

/** Condivide il PNG via Web Share API (con files) o fallback download. */
export async function shareCard(blob: Blob): Promise<void> {
  const file = new File([blob], 'lucidme.png', { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
  };
  if (typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
    await nav.share({ files: [file], title: 'Vigilia', text: 'Il mio lucidity rate' });
    return;
  }
  // Fallback: download diretto.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lucidme.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Crea un canvas offscreen (DPR-safe per qualità). Environment-agnostic. */
function createCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('toBlob fallito'));
    }, 'image/png');
  });
}
