/**
 * main.ts — entry della landing: stili, wordmark, hero generativo, waitlist.
 * La struttura della pagina è tutta in index.html (statica, SEO-friendly);
 * qui solo i tre behavior progressivi.
 */
import './tokens.css';
import './landing.css';
import { applyBrand } from './brand';
import { initHero } from './hero';
import { initWaitlistForm } from './form';

applyBrand();

const heroCanvas = document.querySelector<HTMLCanvasElement>('#hero-canvas');
if (heroCanvas) initHero(heroCanvas);

initWaitlistForm();
