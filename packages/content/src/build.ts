/**
 * Build del Sentiero (§S3-1).
 *
 * Legge `lessons/*.md`, parsifica il frontmatter, valida ogni lezione contro
 * lo schema, verifica che ogni `sources[].ref` esista in `99-fonti.md` e
 * emette un bundle JSON (`src/bundle.json`).
 *
 * **Regola bloccante del ticket**: il build DEVE fallire (throw) se:
 *  - una lezione non rispetta lo schema;
 *  - un `ref` citato non è presente nelle fonti wiki;
 *  - mancano lezioni (non ci sono tutte le 21 + 2 extra);
 *  - i giorni 1..21 non sono sequenziali.
 *
 * Filesystem-agnostic: il build vero legge da disco; i test passano dati
 * in-memory. Così evitiamo dipendenze da node:fs nei test vitest.
 */
import type { Lesson } from './schema.js';
import { validateLesson } from './schema.js';
import { parseFrontmatter } from './frontmatter.js';
import { parseWikiSources } from './sources.js';

/** Input di un singolo file lezione per il build. */
export interface LessonInput {
  /** Path/relativo solo per i messaggi d'errore. */
  name: string;
  content: string;
}

/** Risultato del build: il bundle + eventuali warnings. */
export interface BuildResult {
  lessons: Lesson[];
  extras: Lesson[];
  warnings: string[];
}

/**
 * Costruisce il bundle a partire dai file letti (in-memory). Lancia su errore
 * di validazione (ref mancante, schema rotto, lezioni mancanti).
 *
 * @param inputs file delle lezioni (md completo, frontmatter incluso)
 * @param wikiSourcesMarkdown contenuto di `99-fonti.md` (per estrarre le chiavi)
 */
export function buildBundle(
  inputs: LessonInput[],
  wikiSourcesMarkdown: string,
): BuildResult {
  const knownSources = parseWikiSources(wikiSourcesMarkdown);
  const warnings: string[] = [];
  const lessons: Lesson[] = [];
  const extras: Lesson[] = [];
  const seenDays = new Set<number>();

  for (const input of inputs) {
    const parsed = parseFrontmatter(input.content);
    const candidate = { ...parsed.data, body: parsed.body } as unknown;
    const errors = validateLesson(candidate, knownSources);
    if (errors.length > 0) {
      throw new Error(
        `Lezione "${input.name}" non valida:\n  - ${errors.join('\n  - ')}`,
      );
    }
    const lesson = candidate as Lesson;
    if (seenDays.has(lesson.day)) {
      throw new Error(`Giorno ${lesson.day} duplicato (lezione "${input.name}")`);
    }
    seenDays.add(lesson.day);
    if (Number.isInteger(lesson.day)) {
      lessons.push(lesson);
    } else {
      extras.push(lesson);
    }
  }

  // Verifica completezza: 21 lezioni, giorni 1..21 senza buchi.
  for (let d = 1; d <= 21; d++) {
    if (!lessons.some((l) => l.day === d)) {
      throw new Error(`Lezione mancante per il giorno ${d}`);
    }
  }
  if (lessons.length !== 21) {
    throw new Error(
      `Numero lezioni principali atteso 21, trovate ${lessons.length}`,
    );
  }
  lessons.sort((a, b) => a.day - b.day);
  extras.sort((a, b) => a.day - b.day);

  if (extras.length === 0) {
    warnings.push('Nessuna lezione extra caricata (recall-01/recall-02).');
  }

  return { lessons, extras, warnings };
}

/**
 * Serializza il bundle in JSON. Formato: `{ version, generatedAt, lessons, extras }`.
 * `generatedAt` è opzionale (per riproducibilità nei test, passare null).
 */
export function serializeBundle(result: BuildResult, generatedAt: string | null): string {
  const payload = {
    version: 1,
    generatedAt,
    lessons: result.lessons,
    extras: result.extras,
  };
  // pretty-print leggibile (il bundle è committed).
  return JSON.stringify(payload, null, 2) + '\n';
}
