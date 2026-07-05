/**
 * Shim ambient per far passare `tsc --noEmit` sui file Svelte 5 del package ui.
 *
 * `tsc` nativamente NON comprende i `.svelte` né le rune ($state, $props, …):
 * quelle sono gestite dal compilatore Svelte e validate da `svelte-check`.
 * Questo file fornisce dichiarazioni minime affinché `tsc` (verifica minima del
 * ticket S1-1) non riporti falsi positivi sui re-export dei componenti e sullo
 * store rune-based. La verifica reale dei componenti avviene con `svelte-check`
 * (dal package app, vedi ticket S1-2/S1-5).
 */
declare module '*.svelte' {
  // Type-less: il tipo reale è fornito da svelte2tsx a runtime di svelte-check.
  // Usiamo `any` solo qui (shim ambient), MAI nel codice applicativo.
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const Component: any;
  export default Component;
}

// Rune come globali (solo per tsc; svelte-check le gestisce nativamente).
declare const $state: <T>(initial: T) => T;
declare const $props: <T>() => T;
declare const $derived: <T>(fn: () => T) => T;
declare const $effect: (fn: () => unknown) => void;
declare const $bindable: <T>(initial?: T) => T;
