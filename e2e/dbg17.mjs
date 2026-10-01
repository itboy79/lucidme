import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const app = await browser.newPage({ viewport: { width: 393, height: 660 } });
await app.route('**/sw.js', (r) => r.abort());
let n = 0;
app.on('framenavigated', (f) => f === app.mainFrame() && n++);
await app.goto('http://localhost:7777/app/onboarding', { waitUntil: 'commit' });
await new Promise((r) => setTimeout(r, 5000));
console.log('senza sw.js → navigazioni:', n, '| url:', app.url());
const info = await app.evaluate(() => ({
  h1: document.querySelector('h1')?.textContent ?? null,
  btns: [...document.querySelectorAll('button')].length,
})).catch((e) => ({ err: String(e).slice(0, 80) }));
console.log('DOM:', JSON.stringify(info));
process.exit(0);
