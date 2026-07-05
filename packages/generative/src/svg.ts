/**
 * svg.ts — esporta l'organismo come stringa SVG statica (snapshot a timeMs=0).
 *
 * Stesse regole visive di `renderFrame` (stesso consumo di PRNG, stesso ordine),
 * ma rese con primitive SVG. Snapshot fisso → usato per thumbnail/share e per i
 * snapshot test (determinismo).
 *
 * L'output è un `<svg viewBox="0 0 size size">` con l'organismo centrato.
 * Le trasformazioni (translate/rotate/scale breathe) sono applicate via attributi
 * `transform` su un `<g>`, replicando la matrice del canvas.
 */
import { mulberry32, hashStr } from './prng.js';
import type { OrganismParams, Lucidity } from './types.js';
import { emotionHue } from './types.js';

/** Arrotonda a 2 decimali per stringhe SVG stabili e compatte. */
const n = (v: number): string => {
  const r = Math.round(v * 100) / 100;
  // evita "-0"
  return r === 0 ? '0' : String(r);
};

/**
 * Restituisce l'SVG statico dell'organismo.
 * @param p    parametri (seed, emotion, lucidity).
 * @param size lato del riquadro SVG in px (l'organismo è centrato; R = size/2 * 0.62).
 */
export function toStaticSVG(p: OrganismParams, size: number): string {
  const luc = p.lucidity as Lucidity;
  const hue = emotionHue(p.emotion);
  // R coerente con l'uso preview del prototipo (52..76 in albaPreview); qui lo
  // deriviamo dalla size perché la funzione è generica. R = size * 0.34.
  const R = size * 0.34;

  const rnd = mulberry32(hashStr(p.seed));
  const petals = 5 + Math.floor(rnd() * 7);
  const glow = 0.25 + luc * 0.25;
  // timeMs = 0 → termine temporale a 0, ma le chiamate rnd() restano consumate.
  const rot = rnd() * Math.PI * 2; // + 0 * (...)
  rnd(); // consume del secondo rnd() del termine rot (timeMs=0)
  const breathe = 1 + Math.sin(rnd() * 6) * 0.045; // sin(0+..) = sin(rnd*6)

  const cx = size / 2;
  const cy = size / 2;

  const parts: string[] = [];
  // defs: aura gradient + core glow filter
  parts.push('<defs>');
  parts.push(
    `<radialGradient id="aura" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="hsl(${hue},80%,72%)" stop-opacity="${n(glow * 0.5)}"/>` +
      `<stop offset="100%" stop-color="hsl(${hue},80%,72%)" stop-opacity="0"/>` +
      `</radialGradient>`,
  );
  parts.push(
    `<filter id="coreGlow" x="-80%" y="-80%" width="260%" height="260%">` +
      `<feGaussianBlur stdDeviation="${n((10 + luc * 12) / 3)}"/>` +
      `</filter>`,
  );
  parts.push('</defs>');

  // aura (cerchio grande, raggio R*1.5, centrato)
  parts.push(
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 1.5)}" fill="url(#aura)"/>`,
  );

  // gruppo trasformato: translate(cx,cy) rotate(rot) scale(breathe)
  const rotDeg = (rot * 180) / Math.PI;
  parts.push(
    `<g transform="translate(${n(cx)},${n(cy)}) rotate(${n(rotDeg)}) scale(${n(breathe)})">`,
  );

  // petals — bezier path identica al canvas (bezierCurveTo → C/S in path data).
  // Il canvas disegna il petalo "in giù" (len positivo = verso y crescente).
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const len = R * (0.6 + rnd() * 0.4);
    const wid = R * (0.16 + rnd() * 0.14);
    // timeMs=0 → sway = sin(i*1.7)*.09
    const sway = Math.sin(i * 1.7) * 0.09;
    const fillHue = hue + (rnd() - 0.5) * 24;
    const fill = `hsla(${n(fillHue)},72%,${58 + luc * 7}%,${n(0.3 + luc * 0.14)})`;
    const stroke = `hsla(${hue},85%,80%,${n(0.35 + luc * 0.18)})`;

    // path del petalo (control point identici al canvas):
    //   M0,0 C wid,len*.35  wid*.5,len*.85  0,len
    //        C -wid*.5,len*.85  -wid,len*.35  0,0
    const d =
      `M0,0 ` +
      `C${n(wid)},${n(len * 0.35)} ${n(wid * 0.5)},${n(len * 0.85)} 0,${n(len)} ` +
      `C${n(-wid * 0.5)},${n(len * 0.85)} ${n(-wid)},${n(len * 0.35)} 0,0`;

    parts.push(
      `<g transform="rotate(${n(((a + sway) * 180) / Math.PI)})">` +
        `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="0.8"/>`,
    );

    // filament
    if (rnd() > 0.45) {
      // quadratic: M0,len Q wid*.6,len*1.18 0,len*1.32
      const fd =
        `M0,${n(len)} ` +
        `Q${n(wid * 0.6)},${n(len * 1.18)} 0,${n(len * 1.32)}`;
      const fstroke = `hsla(${hue},90%,85%,${n(0.3 + luc * 0.2)})`;
      const dotFill = `hsla(${hue},95%,88%,${n(0.5 + luc * 0.15)})`;
      parts.push(
        `<path d="${fd}" fill="none" stroke="${fstroke}" stroke-width="0.7"/>` +
          `<circle cx="0" cy="${n(len * 1.32)}" r="${n(1.6 + luc * 0.9)}" fill="${dotFill}"/>`,
      );
    }
    parts.push('</g>');
  }

  // core (con glow via filter). shadowBlur del canvas ≈ stdDeviation/3 → qui
  // disegniamo un cerchio glow separato sotto il core, più un core netto sopra.
  const coreR = R * 0.16 + luc * 2;
  const coreFill = `hsla(${hue},95%,${80 + luc * 5}%,0.95)`;
  const glowFill = `hsla(${hue},95%,75%,0.9)`;
  parts.push(
    `<circle cx="0" cy="0" r="${n(coreR * 2.4)}" fill="${glowFill}" filter="url(#coreGlow)" opacity="0.7"/>`,
  );
  parts.push(`<circle cx="0" cy="0" r="${n(coreR)}" fill="${coreFill}"/>`);

  parts.push('</g>'); // close transformed group

  // Svg wrapper. Aggiungiamo xmlns per validità standalone (share).
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(size)} ${n(size)}" width="${n(size)}" height="${n(size)}">` +
    parts.join('') +
    `</svg>`
  );
}
