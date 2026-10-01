/**
 * public-env — variabili PUBLIC_* BAKED al build.
 *
 * Perché questo modulo: SvelteKit NON inlina `import.meta.env.PUBLIC_*` da
 * process.env nelle build client statiche (Vite puro sì — per questo il sito
 * funziona e l'app no). Con `define` in vite.config.ts questi identificatori
 * vengono sostituiti al build con il valore di process.env (CI/`.env`).
 *
 * Fallback runtime su process.env (node/vitest) quando il define è vuoto:
 * i test continuano a usare `vi.stubEnv`.
 */

/** Sostituiti da vite.config.ts (define) — mai leggere direttamente. */
declare const __LUCID_PUBLIC_BETA__: string | undefined;
declare const __LUCID_PUBLIC_FEEDBACK_ENDPOINT__: string | undefined;
declare const __LUCID_PUBLIC_POSTHOG_KEY__: string | undefined;
declare const __LUCID_PUBLIC_POSTHOG_HOST__: string | undefined;

function fromProcess(name: string): string | undefined {
  if (typeof process === 'undefined') return undefined;
  return (process.env as Record<string, string | undefined>)[name];
}

function bakedOrRuntime(baked: string | undefined, name: string): string | undefined {
  return baked && baked.length > 0 ? baked : fromProcess(name);
}

export const PUBLIC_BETA = bakedOrRuntime(__LUCID_PUBLIC_BETA__, 'PUBLIC_BETA');
export const PUBLIC_FEEDBACK_ENDPOINT = bakedOrRuntime(
  __LUCID_PUBLIC_FEEDBACK_ENDPOINT__,
  'PUBLIC_FEEDBACK_ENDPOINT',
);
export const PUBLIC_POSTHOG_KEY = bakedOrRuntime(__LUCID_PUBLIC_POSTHOG_KEY__, 'PUBLIC_POSTHOG_KEY');
export const PUBLIC_POSTHOG_HOST = bakedOrRuntime(
  __LUCID_PUBLIC_POSTHOG_HOST__,
  'PUBLIC_POSTHOG_HOST',
);
