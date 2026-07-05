/**
 * Mini renderer markdown → HTML per il sottoinsieme usato nelle lezioni
 * del Sentiero (§S3-4). Niente dipendenze.
 *
 * Sottoinsieme supportato:
 *  - `# H1`, `## H2` (riga che inizia con uno o due `#`)
 *  - paragrafi (separati da riga vuota)
 *  - `**bold**` inline
 *  - `- item` liste non ordinate
 *  - `_italic_` inline (leggero)
 *
 * Output sanitizzato: l'input è il body delle lezioni (contenuto controllato,
 * non utente), ma comunque escapiamo `<>&` per evitare injection accidentali.
 */

/** Escapa i caratteri HTML pericolosi. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Applica formattazione inline (bold, italic) a una riga già escapata. */
function inline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\b__([^_]+)__\b/g, '$1<strong>$2</strong>')
    .replace(/(^|[^a-zA-Z0-9_])\/([^/]+)\/(?=$|[^a-zA-Z0-9_])/g, '$1<em>$2</em>');
}

/**
 * Renderizza il body markdown di una lezione in HTML.
 * Struttura a blocchi: headings, paragrafi, liste. Ogni blocco è separato
 * da riga vuota (tranne le liste, che sono sequenze di `- `).
 */
export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  let i = 0;
  let para: string[] = [];

  const flushPara = (): void => {
    if (para.length > 0) {
      const text = inline(escapeHtml(para.join(' ')));
      blocks.push(`<p>${text}</p>`);
      para = [];
    }
  };

  while (i < lines.length) {
    const raw = lines[i] ?? '';
    const line = raw.trim();

    if (line === '') {
      flushPara();
      i += 1;
      continue;
    }

    // Headings
    const h2 = line.match(/^##\s+(.*)$/);
    const h1 = line.match(/^#\s+(.*)$/);
    if (h2) {
      flushPara();
      blocks.push(`<h2>${inline(escapeHtml(h2[1] ?? ''))}</h2>`);
      i += 1;
      continue;
    }
    if (h1) {
      flushPara();
      blocks.push(`<h1>${inline(escapeHtml(h1[1] ?? ''))}</h1>`);
      i += 1;
      continue;
    }

    // Lista non ordinata (sequenza di `- `)
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test((lines[i] ?? '').trim())) {
        const item = (lines[i] ?? '').trim().replace(/^[-*]\s+/, '');
        items.push(`<li>${inline(escapeHtml(item))}</li>`);
        i += 1;
      }
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Paragrafo: accumula righe fino a riga vuota o blocco speciale
    para.push(line);
    i += 1;
  }
  flushPara();

  return blocks.join('\n');
}
