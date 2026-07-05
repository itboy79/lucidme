/**
 * Estrae le chiavi delle fonti da `99-fonti.md` (§S3-1).
 *
 * Il file della bibliografia è markdown con voci del tipo:
 *   - Saunders et al. 2016, meta-analisi incidenza (ScienceDirect): https://...
 *
 * Non c'è un identificatore esplicito: deriviamo una chiave stabile.
 * Strategia in due passi:
 *  1. Se la voce contiene un anno a 4 cifre, la chiave è `<cognome>-<anno>`
 *     (`Saunders et al. 2016` → `saunders-2016`). Cognome = prima parola della
 *     voce, lowercase, normalizzata.
 *  2. Altrimenti chiave = slug del primo pezzo di testo significativo
 *     (es. `Prophetic Halo (Sify)` → `prophetic-halo`).
 *
 * Il Set prodotto è la "allowlist" che `validateLesson`/`build` consultano:
 * ogni `ref` citato da una lezione DEVE comparire qui, o il build fallisce.
 */

/** Slug semplice: lowercase, ascii, parole separate da `-`. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accenti
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/**
 * Da una riga di bibliografia estrae (se possibile) la chiave `<cognome>-<anno>`.
 * Riconosce `Cognome et al. YYYY` e `Cognome YYYY`. Ritorna null se non matcha.
 */
function authorYearKey(line: string): string | null {
  // "Saunders et al. 2016" / "Konkoly et al. 2024" / "Stumbrys et al. 2012"
  const m = line.match(/^\s*([A-Za-zÀ-ÿ]+)\s+(?:et al\.?\s+)?(\d{4})\b/);
  if (m) {
    const surname = m[1] ?? '';
    const year = m[2] ?? '';
    return `${slugify(surname)}-${year}`;
  }
  return null;
}

/**
 * Parsa l'intero markdown della bibliografia e ritorna il Set delle chiavi.
 *
 * Considera SOLO le righe di elenco che iniziano con `- ` e contengono un URL
 * o un anno (filtro grezzo che scarta le intestazioni `##` e le note `>`).
 */
export function parseWikiSources(markdown: string): Set<string> {
  const keys = new Set<string>();
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('- ')) continue;
    const body = line.slice(2).trim();
    // deve sembrare una voce di fonte: ha un url o un anno
    const hasUrl = /https?:\/\//i.test(body);
    const hasYear = /\b(19|20)\d{2}\b/.test(body);
    if (!hasUrl && !hasYear) continue;

    const firstSeg = body.split(/[:·(]/)[0] ?? body;
    const key = authorYearKey(body) ?? slugify(firstSeg);
    if (key !== '') keys.add(key);
  }
  return keys;
}
