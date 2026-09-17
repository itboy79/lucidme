/**
 * vite.config.ts — configurazione minima (nessun plugin).
 *
 * envPrefix 'PUBLIC_' come SvelteKit: le variabili PUBLIC_* (es.
 * PUBLIC_WAITLIST_ENDPOINT) vengono esposte su `import.meta.env`.
 */
import { defineConfig } from 'vite';

export default defineConfig({
  envPrefix: 'PUBLIC_',
});
