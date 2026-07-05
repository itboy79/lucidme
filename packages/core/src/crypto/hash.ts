/**
 * Hashing deterministico per i seed degli organismi (§8.3 — `seed` immutabile).
 *
 * FNV-1a 32-bit. Copiato dal prototype e mantenuto IDENTICO: il seed è un
 * contratto stabile (l'aspetto dell'organismo non deve cambiare tra release).
 * NON è crittografico — serve solo una dispersione uniforme e stabile.
 *
 * Invariante: stesso input → stesso output, su qualunque piattaforma.
 */

/**
 * FNV-1a 32-bit. Restituisce un unsigned 32-bit intero.
 * `Math.imul` garantisce comportamento a 32-bit senza overflow NaN/Infinity.
 */
export function hashStr(s: string): number {
  let h = 0x811c9dc5; // 2166136261 offset basis
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // 16777619 prime
  }
  return h >>> 0;
}

/**
 * Seed di un sogno: hash esadecimale a 8 cifre di `id + createdAt`.
 * Stesso calcolo di `createDream`, esposto per riuso/test/ricostituzione.
 */
export function seedHex(id: string, createdAt: string): string {
  return hashStr(id + createdAt).toString(16).padStart(8, '0');
}
