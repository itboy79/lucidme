// Verifica visiva + smoke funzionale della landing (dist su :4174).
// - fullPage screenshot (desktop) e hero+waitlist (mobile)
// - waitlist: email valida → successo + coda localStorage; INVALIDA → errore
//   (su pagina ricaricata: al successo il form viene nascosto, by design)
// NOTA capture: l'hero usa min-height:100svh che entra in loop col resize
// del capture fullPage → fissiamo l'altezza hero via CSS solo nel test.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/lucidme-site-shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 393, height: 660 }],
]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('http://localhost:4174/', { waitUntil: 'networkidle' });
  await page.addStyleTag({
    content: 'html { scroll-behavior: auto !important; } .hero { min-height: 660px !important; }',
  });
  await page.waitForTimeout(900);

  // Screenshot: desktop fullPage, mobile hero + waitlist (scroll).
  if (name === 'desktop') {
    await page.screenshot({ path: `${OUT}/landing-desktop.png`, fullPage: true });
  } else {
    await page.screenshot({ path: `${OUT}/landing-mobile-hero.png` });
    await page.evaluate(() => document.querySelector('#waitlist').scrollIntoView());
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/landing-mobile-waitlist.png` });
  }

  // Smoke 1: email valida → successo + coda locale (nessun endpoint).
  await page.evaluate(() => localStorage.clear());
  await page.locator('#waitlist-email').fill('test@example.com');
  await page.locator('#waitlist-submit').click();
  const successVisible = await page.locator('#waitlist-success').isVisible();
  const queued = await page.evaluate(() => localStorage.getItem('lucidme:waitlist'));
  console.log(`${name}: success=${successVisible ? '✓' : '⚠️'} queued=${queued ? '✓' : '⚠️'}`);

  // Smoke 2 (pagina fresca: al successo il form è hidden by design):
  // email invalida → errore inline, niente coda.
  await page.goto('http://localhost:4174/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.locator('#waitlist-email').fill('non-una-email');
  await page.locator('#waitlist-submit').click();
  await page.waitForTimeout(200);
  const errVisible = await page.locator('#waitlist-error').isVisible();
  const notQueued = await page.evaluate(() => localStorage.getItem('lucidme:waitlist') === null);
  console.log(`${name}: invalid-error=${errVisible ? '✓' : '⚠️'} not-queued=${notQueued ? '✓' : '⚠️'}`);

  if (errors.length) console.log(`${name} console errors:`, errors.slice(0, 3));
  await page.close();
}

await browser.close();
console.log('shots →', OUT);
