// Giardino — load: assicura che lo store dei sogni sia caricato dal DB.
// Il rendering avviene client-side; lo store è rune-based (reactive).
import type { PageLoad } from './$types.js';
import { dreamsStore } from '$lib/stores/dreams.svelte.js';

export const load: PageLoad = async () => {
  await dreamsStore.ensureLoaded();
  return { ready: true };
};
