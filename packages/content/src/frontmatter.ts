/**
 * Mini-parser per il sottoinsieme YAML che usiamo nei frontmatter delle lezioni
 * (§S3-1). Niente dipendenze esterne.
 *
 * Sottoinsieme supportato:
 *  - chiavi semplici: `key: value`
 *  - stringhe quote singolo/doppio
 *  - numeri interi e decimali
 *  - array inline vuoto `[]` e liste `- item`
 *  - oggetti annidati via indentazione (2 spazi), come `practice: \n  type: ...`
 *  - array di oggetti (`sources:` con sotto-voci `- label: ... \n  ref: ...`)
 *
 * Non è un parser YAML generale: gestisce solo lo schema delle lezioni.
 */

export type YamlValue =
  | string
  | number
  | boolean
  | null
  | YamlValue[]
  | { [k: string]: YamlValue };

/** Risultato del parse: frontmatter + corpo markdown. */
export interface ParsedFile {
  data: Record<string, YamlValue>;
  body: string;
}

/** Strippa le virgolette intorno a una stringa YAML, gestendo gli escape. */
function unquote(s: string): string {
  const trimmed = s.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const inner = trimmed.slice(1, -1);
    if (trimmed.startsWith('"')) {
      // doppie: escape backslash
      return inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    // singole: escape '' → '
    return inner.replace(/''/g, "'");
  }
  return trimmed;
}

/** Converte un valore scalare (post-strip virgolette) nel tipo corretto. */
function coerceScalar(raw: string): YamlValue {
  const t = raw.trim();
  if (t === '') return null;
  // numero intero o decimale (anche negativo)
  if (/^-?\d+$/.test(t)) return Number(t);
  if (/^-?\d+\.\d+$/.test(t)) return Number(t);
  const low = t.toLowerCase();
  if (low === 'true') return true;
  if (low === 'false') return false;
  if (low === 'null' || low === '~') return null;
  return unquote(raw);
}

/**
 * Parsa il valore di una chiave dopo il `:`.
 * Supporta: scalari, `[]` (array vuoto), `[a, b]` (array inline di soli scalari).
 * I block (liste `-` / oggetti annidati) sono gestiti dal parser ricorsivo.
 */
function parseInlineValue(raw: string): YamlValue {
  const t = raw.trim();
  if (t === '[]') return [];
  if (t.startsWith('[') && t.endsWith(']')) {
    const inner = t.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((p) => coerceScalar(p));
  }
  return coerceScalar(raw);
}

/** Indentazione (numero di spazi iniziali) di una riga non vuota. */
function indentOf(line: string): number {
  const m = line.match(/^( *)/);
  return m ? (m[1] ?? '').length : 0;
}

/**
 * Estrae i gruppi di cattura come tupla tipata (no `string | undefined`).
 * `noUncheckedIndexedAccess` rende `m[1]` → `string | undefined`; qui sappiamo
 * che i gruppi sono presenti quando il match avviene. Chiamare SEMPRE dopo il
 * check `if (!m) ...`. Stesso pattern usato in `@lucidme/db` client.
 */
function groups<T extends string[]>(m: RegExpMatchArray): T {
  return m.slice(1) as unknown as T;
}

/** True se la riga è una voce di lista (`- ...`). */
function isListItem(line: string): boolean {
  return /^\s*-\s+/.test(line) || /^\s*-\s*$/.test(line);
}

/** Indentazione della prossima riga non vuota a partire da `from`, o -1. */
function nextIndent(lines: string[], from: number): number {
  for (let j = from; j < lines.length; j++) {
    if ((lines[j] ?? '').trim() === '') continue;
    return indentOf(lines[j] ?? '');
  }
  return -1;
}

/**
 * Parser ricorsivo su un blocco di righe con la stessa base-indent.
 * Ritorna {value, consumed}: `consumed` = numero di righe mangiate.
 */
function parseBlock(lines: string[], start: number, baseIndent: number): {
  value: YamlValue;
  consumed: number;
} {
  // Caso 1: il blocco è una lista di `-` item
  let i = start;
  if (i < lines.length && isListItem(lines[i] ?? '')) {
    const arr: YamlValue[] = [];
    while (i < lines.length) {
      const line = lines[i] ?? '';
      const ind = indentOf(line);
      if (ind < baseIndent) break;
      if (ind === baseIndent && isListItem(line)) {
        // contenuto dopo "- "
        const afterDash = line.replace(/^\s*-\s+/, '');
        // se dopo il dash c'è "key: value", è un oggetto che inizia qui
        const kv = afterDash.match(/^([A-Za-z_][\w]*)\s*:\s*(.*)$/);
        if (kv) {
          // oggetto: prima property sulla riga del dash, eventuali altre annidate sotto
          const obj: Record<string, YamlValue> = {};
          const [k, v] = groups<[string, string]>(kv);
          if (v.trim() === '') {
            // valore block annidato: usa l'indentazione reale del primo figlio
            const childInd = nextIndent(lines, i + 1);
            if (childInd < 0 || childInd <= ind) {
              obj[k] = null;
              i += 1;
            } else {
              const { value, consumed } = parseBlock(lines, i + 1, childInd);
              obj[k] = value;
              i += 1 + consumed;
            }
          } else {
            obj[k] = parseInlineValue(v);
            i += 1;
            // ulteriori property dello stesso oggetto: indent > baseIndent (almeno ind+2)
            while (i < lines.length) {
              const nl = lines[i] ?? '';
              const ni = indentOf(nl);
              if (ni <= ind) break;
              const nkv = nl.match(/^\s*([A-Za-z_][\w]*)\s*:\s*(.*)$/);
              if (nkv) {
                const [nk, nv] = groups<[string, string]>(nkv);
                if (nv.trim() === '') {
                  const ci = nextIndent(lines, i + 1);
                  obj[nk] = ci >= 0 && ci > ni ? parseBlock(lines, i + 1, ci).value : null;
                } else {
                  obj[nk] = parseInlineValue(nv);
                }
              }
              i += 1;
            }
          }
          arr.push(obj);
        } else {
          // scalare o stringa semplice
          arr.push(coerceScalar(afterDash));
          i += 1;
        }
      } else if (ind > baseIndent) {
        // continuazione: non dovrebbe capitare con il nostro schema; salta.
        i += 1;
      } else {
        break;
      }
    }
    return { value: arr, consumed: i - start };
  }

  // Caso 2: il blocco è una mappa di `key: value`
  const obj: Record<string, YamlValue> = {};
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      i += 1;
      continue;
    }
    const ind = indentOf(line);
    if (ind < baseIndent) break;
    if (ind > baseIndent) {
      // riga annidata fuori posto: salta (robustezza)
      i += 1;
      continue;
    }
    if (isListItem(line)) break; // lista a questo indent = non è una mappa
    const kv = line.match(/^\s*([A-Za-z_][\w]*)\s*:\s*(.*)$/);
    if (!kv) {
      i += 1;
      continue;
    }
    const [k, v] = groups<[string, string]>(kv);
    if (v.trim() === '') {
      // valore block annidato (lista o mappa): indent del primo figlio reale
      const childInd = nextIndent(lines, i + 1);
      if (childInd < 0 || childInd <= baseIndent) {
        obj[k] = null;
        i += 1;
      } else {
        const { value, consumed } = parseBlock(lines, i + 1, childInd);
        obj[k] = value;
        i += 1 + consumed;
      }
    } else {
      obj[k] = parseInlineValue(v);
      i += 1;
    }
  }
  return { value: obj, consumed: i - start };
}

/**
 * Divide un file markdown in frontmatter (`---` ... `---`) e corpo.
 * Lancia se il frontmatter non è ben delimitato.
 */
export function parseFrontmatter(content: string): ParsedFile {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    throw new Error('frontmatter mancante: il file deve iniziare con "---"');
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) {
    throw new Error('frontmatter non terminato: manca il "---" di chiusura');
  }
  const fmLines = lines.slice(1, end);
  const body = lines.slice(end + 1).join('\n').replace(/^\n+/, '');
  const { value } = parseBlock(fmLines, 0, 0);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('frontmatter non è una mappa di chiavi');
  }
  return { data: value as Record<string, YamlValue>, body };
}
