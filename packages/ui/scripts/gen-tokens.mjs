#!/usr/bin/env node
/**
 * gen-tokens.mjs — genera `src/tokens/tokens.css` dai sorgenti TypeScript in
 * `src/tokens/`. TS resta la fonte unica di verità; questo script proietta i
 * valori come CSS custom properties con prefisso `--lm-*`.
 *
 * Run: `pnpm --filter @lucidme/ui gen:tokens`  (oppure `node scripts/gen-tokens.mjs`)
 *
 * Richiede Node >= 22.6 con `--experimental-strip-types` (default da Node 23.6+).
 * Il package ha `"type":"module"`, quindi importare `.ts` qui dentro funziona.
 *
 * NON aggiunge dipendenze: legge i .ts via type-stripping nativo di Node.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { colors, emotionHues, extraColors } from '../src/tokens/colors.ts';
import { fontFamily, googleFontsHref } from '../src/tokens/typography.ts';
import { easings, durations, keyframeDurations, blobDelays } from '../src/tokens/motion.ts';
import { radius, blobRadius, emotionChipRadius, signRadius } from '../src/tokens/radius.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../src/tokens/tokens.css');

/** Converte un camelCase key in kebab-case (es. `inkDim` → `ink-dim`). */
const kebab = (k) => k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const lines = [
  '/* AUTO-GENERATO da `scripts/gen-tokens.mjs`. NON EDITARE A MANO.',
  ' * Fonte: `src/tokens/*.ts` (estratti dal prototipo Organico Generativo).',
  ' * Rigenerare con `pnpm --filter @lucidme/ui gen:tokens`.',
' * Sincronizzato con i valori del `:root` del prototipo byte per byte. */',
  ':root {',
];

// Colori base → --lm-<kebab>
for (const [k, v] of Object.entries(colors)) {
  lines.push(`  --lm-${kebab(k)}: ${v};`);
}
// Hue emozioni → --lm-hue-<emotion>
for (const [k, v] of Object.entries(emotionHues)) {
  lines.push(`  --lm-hue-${kebab(k)}: ${v};`);
}
// Colori extra (notteTitle, notteEyebrow, stageFrame)
for (const [k, v] of Object.entries(extraColors)) {
  lines.push(`  --lm-${kebab(k)}: ${v};`);
}

// Font family
lines.push(`  --lm-font-serif: ${fontFamily.serif};`);
lines.push(`  --lm-font-sans: ${fontFamily.sans};`);
lines.push(`  --lm-fonts-href: ${googleFontsHref};`);

// Easing (alias leggibili)
lines.push(`  --lm-ease: ${easings.organic};`);
lines.push(`  --lm-ease-standard: ${easings.standard};`);

// Durate transizioni (ms → ms)
for (const [k, v] of Object.entries(durations)) {
  lines.push(`  --lm-duration-${kebab(k)}: ${v}ms;`);
}
// Durate keyframes
for (const [k, v] of Object.entries(keyframeDurations)) {
  lines.push(`  --lm-keyframe-${kebab(k)}: ${v}ms;`);
}
// Blob delays
for (const [k, v] of Object.entries(blobDelays)) {
  lines.push(`  --lm-blob-delay-${kebab(k)}: ${v}ms;`);
}

// Radius semplici
for (const [k, v] of Object.entries(radius)) {
  lines.push(`  --lm-radius-${kebab(k)}: ${v};`);
}
// Blob radius (b1/b2/b3)
for (const [k, v] of Object.entries(blobRadius)) {
  lines.push(`  --lm-blob-${kebab(k)}: ${v};`);
}
lines.push(`  --lm-radius-emotion-chip: ${emotionChipRadius};`);
lines.push(`  --lm-radius-sign: ${signRadius};`);

lines.push('}');
lines.push('');

// Reset/base minimo (allineato a prototipo `*{margin:0;padding:0;box-sizing:border-box}`)
lines.push('/* Base reset allineato al prototipo. */');
lines.push('html, body { margin: 0; padding: 0; }');
lines.push('body {');
lines.push('  background: var(--lm-bg1);');
lines.push('  color: var(--lm-ink);');
lines.push('  font-family: var(--lm-font-sans);');
lines.push('  -webkit-font-smoothing: antialiased;');
lines.push('  text-rendering: optimizeLegibility;');
lines.push('}');

const css = lines.join('\n') + '\n';
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, css, 'utf8');
console.log(`✓ tokens.css scritto: ${outPath} (${css.length} bytes)`);
