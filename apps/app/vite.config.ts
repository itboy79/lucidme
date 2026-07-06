import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

/**
 * PWA via vite-plugin-pwa (generateSW strategy, registerType prompt).
 * Pattern consigliato dalla doc ufficiale per SvelteKit (no peer nascoste).
 * Precache dell'app shell; NESSUNA cache runtime custom in Step 0 (regola S0-2).
 */
export default defineConfig({
  plugins: [
    sveltekit(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'],
      injectRegister: false, // registriamo manualmente in src/lib/pwa/register.ts (step S0-2)
      manifest: {
        name: 'Lucid Me',
        short_name: 'Lucid Me',
        description: 'Coach scientifico per la pratica e il tracciamento dei sogni lucidi.',
        lang: 'it',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a0a14',
        theme_color: '#0a0a14',
        categories: ['health', 'lifestyle', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        globIgnores: ['**/*.env*', '**/*.map'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    port: 4173,
    host: true,
  },
  // better-sqlite3 è Node-only (binding nativi): non deve MAI essere ottimizzato
  // o risolto nel bundle browser. Il path browser passa per sqlite-wasm
  // (BrowserSqliteDB); NodeSqliteDB è importato dinamicamente solo in node/test.
  optimizeDeps: {
    exclude: ['better-sqlite3', '@sqlite.org/sqlite-wasm'],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      // I plugin Capacitor sono risolti dinamicamente (`await import(...)`) e
      // solo su nativo (`isNative()`). Sul web non vanno mai caricati: li
      // esternalizziamo dal bundle PWA così Rollup non tenta di risolverli.
      // A runtime, il path web non entra mai in quei rami (guard isNative()).
      // Stesso discorso per better-sqlite3 (Node-only) e wa-sqlite/sqlite-wasm
      // (caricati dinamicamente solo dal path browser pertinente).
      external: [
        '@capacitor/core',
        '@capacitor/local-notifications',
        '@capacitor/haptics',
        '@capacitor/app',
        '@capacitor/filesystem',
        'better-sqlite3',
      ],
    },
  },
  test: {
    // Unit test della lib dell'app (scheduler, prompt-pool, etc.).
    // I .svelte sono esclusi dal typecheck qui (gestiti da svelte-check).
    include: ['src/lib/**/*.test.ts'],
    environment: 'node',
  },
});
