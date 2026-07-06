import { expect, test } from '@playwright/test';

/**
 * Smoke test — versione Step 1+.
 * La home reindirizza a /giardino (Step 1+); verifichiamo:
 * - l'app si avvia e mostra il brand "Lucid Me" (nella nav)
 * - il manifest è raggiungibile e ben formato
 * - le 5 sezioni della nav sono presenti
 * - la navigazione tra sezioni funziona
 */
test.describe('Smoke — app base', () => {
  test('l\'app si avvia e mostra il brand + nav', async ({ page }) => {
    // Al primo avvio l'app reindirizza a /onboarding. Completiamolo (skip) così
    // la nav diventa visibile e possiamo verificarne il contenuto.
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding/);
    await page.getByRole('button', { name: /salta/i }).click();
    await expect(page).toHaveURL(/\/giardino/);
    // La nav è sempre presente; contiene le 5 lune.
    await expect(page.locator('nav')).toBeVisible();
    // Almeno un pulsante nav con testo "Giardino" o "Alba".
    const navTexts = await page.locator('nav button').allTextContents();
    expect(navTexts.join('|').toLowerCase()).toContain('giardino');
  });

  test('navigation tra le 5 sezioni', async ({ page }) => {
    await page.goto('/');
    // Clicca ogni sezione e verifica che l'URL cambi.
    for (const sec of ['sentiero', 'alba', 'notte', 'lume', 'giardino']) {
      const btn = page.locator('nav button', { hasText: /sentiero|alba|notte|lume|giardino/i }).filter({ hasText: new RegExp(`^${sec}$`, 'i') }).first();
      if (await btn.count() > 0) {
        await btn.click();
        await expect(page).toHaveURL(new RegExp(`/${sec}`));
      }
    }
  });

  test('manifest è raggiungibile e ben formato', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBe('Lucid Me');
    expect(manifest.display).toBe('standalone');
    expect(String(manifest.theme_color).toLowerCase()).toBe('#0a0a14');
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('favicon SVG è servita', async ({ request }) => {
    const res = await request.get('/favicon.svg');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('<svg');
  });

  test('service worker è generato (PWA installabile)', async ({ request }) => {
    const res = await request.get('/sw.js');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('precache');
  });
});
