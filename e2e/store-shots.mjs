// Screenshot store (S8-4 prep): 6.7" (1290×2796) e 6.1" (1179×2556).
// Usa il preview build su :4173 (già attivo se e2e girato; altrimenti fallisce
// con un errore chiaro). Le catture sono PLACEHOLDER: il PM scelga le caption
// definitive (vedi store/screenshots/README.md).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = 'http://localhost:4173';
// NOTA: fileURLToPath decodifica già %20; NON usare url.pathname direttamente
// (creerebbe cartelle letterali "Lucid%20me" — spazio nel path del repo).
const OUT = fileURLToPath(new URL('../apps/app/store/screenshots/', import.meta.url));
mkdirSync(OUT, { recursive: true });

// Dimensioni schermo Apple (device pixel: screenshot a deviceScaleFactor 3).
const SIZES = {
  '6.7': { w: 430, h: 932, dsf: 3 }, // iPhone 14/15 Plus → 1290×2796
  '6.1': { w: 393, h: 852, dsf: 3 }, // iPhone 14/15 → 1179×2556
};

// Rotte da mostrare (le 5 sezioni + paywall).
const SHOTS = [
  { route: '/onboarding', name: '01-onboarding', wait: 900 },
  { route: '/alba', name: '02-alba', wait: 900 },
  { route: '/sentiero', name: '03-sentiero', wait: 1200 },
  { route: '/notte', name: '04-notte', wait: 900 },
  { route: '/giardino', name: '05-giardino', wait: 1200 },
  { route: '/pro', name: '06-pro', wait: 900 },
];

const browser = await chromium.launch();

async function capture(sizeKey, page, shot) {
  await page.goto(`${BASE}${shot.route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(shot.wait);
  await page.screenshot({ path: `${OUT}/${sizeKey}/${shot.name}.png` });
  console.log(`✓ ${sizeKey}/${shot.name}.png`);
}

for (const [key, { w, h, dsf }] of Object.entries(SIZES)) {
  mkdirSync(`${OUT}/${key}`, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: dsf,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  // Onboarding: completa con un sogno così le altre rotte hanno contenuto
  // (stesso documento SPA → store in-memory vivo).
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  if (page.url().includes('/onboarding')) {
    await page.getByRole('button', { name: /^inizi[ae]$/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^avanti$/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^non ora$/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('radio', { name: 'meraviglia' }).click();
    await page.getByLabel(/racconto/i).fill(
      'Un giardino sospeso tra le stelle, ogni fiore un ricordo della notte.',
    );
    await page.getByRole('button', { name: /pianta il primo sogno/i }).click();
    await page.waitForTimeout(900);
  }

  // Navigazione in-app (mantiene lo store): le rotte via goto
  // ricreerebbero il documento e perderebbero lo stato di onboarding.
  for (const shot of SHOTS) {
    if (shot.route === '/onboarding') continue; // già catturata sotto con goto
    const seg = shot.route.replace('/', '');
    if (['giardino', 'sentiero', 'alba', 'notte', 'lume'].includes(seg)) {
      await page.getByRole('button', { name: new RegExp(`^${seg}$`, 'i') }).click();
    } else {
      // /pro: nav a notte poi tap sul gesto TLR (trigger paywall)
      await page.getByRole('button', { name: /^notte$/i }).click();
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: /training audio tlr/i }).click();
    }
    await page.waitForTimeout(shot.wait);
    await page.screenshot({ path: `${OUT}/${key}/${shot.name}.png` });
    console.log(`✓ ${key}/${shot.name}.png`);
  }

  // Onboarding richiede stato fresco: nuova pagina nel contesto.
  const onbPage = await ctx.newPage();
  await onbPage.goto(`${BASE}/onboarding`, { waitUntil: 'networkidle' });
  await onbPage.waitForTimeout(900);
  await onbPage.screenshot({ path: `${OUT}/${key}/01-onboarding.png` });
  console.log(`✓ ${key}/01-onboarding.png`);
  if (errors.length > 0) console.log(`  ⚠️ console errors (${key}):`, errors.slice(0, 3));
  await ctx.close();
}

await browser.close();
console.log('\nDone →', OUT);
