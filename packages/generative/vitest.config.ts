import { defineConfig } from 'vitest/config';

/**
 * Vitest config per @lucidme/generative.
 * Nessuna dipendenza DOM: i test girano in node puro. Verificano determinismo
 * del PRNG, dell'SVG statico (snapshot) e del layout del giardino.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    // Snapshot serializzati come file accanto ai test per diff puliti.
    snapshotFormat: { escapeString: true, printBasicPrototype: false },
  },
});
