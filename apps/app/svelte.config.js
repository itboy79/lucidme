import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Base path configurabile (deploy self-hosted sotto /app, es. nibrun).
    // Default '' = root (dev, e2e, Capacitor). In build: KIT_BASE=/app pnpm build.
    paths: {
      base: /** @type {'' | `/${string}` | undefined} */ (process.env.KIT_BASE ?? ''),
    },
    // SPA mode: una sola index.html con fallback client-side. Prerequisite per Capacitor.
    adapter: adapter({
      fallback: 'index.html',
      precompress: false,
      strict: false,
    }),
    alias: {
      // "$lib" è gestito nativamente da SvelteKit
      $core: '../../packages/core/src',
      $db: '../../packages/db/src',
      $ui: '../../packages/ui/src',
      $generative: '../../packages/generative/src',
      // I package workspace @lucidme/* sono risolti da pnpm via symlinks in
      // apps/app/node_modules/@lucidme/*. Aggiungiamo qui @lucidme/content
      // perché, non potendo fare `pnpm install` in questo step, il symlink non
      // esiste: svelte-check + vite leggono kit.alias e risolvono il path.
      '@lucidme/content': '../../packages/content/src/index.ts',
    },
  },
};

export default config;
