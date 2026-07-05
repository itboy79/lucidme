/**
 * PRNG deterministico — COPIATO ESATTAMENTE dal prototipo Organico Generativo
 * (righe 217-218 del file HTML).
 *
 * Stesso algoritmo di `@lucidme/core` (`crypto/hash.ts`, FNV-1a 32-bit):
 * manteniamo una copia locale per garantire zero dipendenze esterne e perché il
 * contratto "stesso seed → stesso organismo" deve restare stabile a prescindere
 * dai rifattor di core. Il test `prng.test.ts` verifica che `hashStr` qui e in
 * core producano valori identici.
 */

/**
 * mulberry32 — PRNG a stato singolo. Copiato letteralmente dal prototipo:
 *   function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;...}}
 * Restituisce una funzione che, a ogni chiamata, produce un float in [0,1).
 */
export function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * hashStr — FNV-1a 32-bit. Copiato letteralmente dal prototipo:
 *   function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
 * Restituisce un unsigned 32-bit. NON crittografico.
 */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
