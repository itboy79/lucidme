/**
 * API pubblica del package contenuti (§S3-1).
 *
 * `bundle.json` è generato da `scripts/build.mjs` e committato (artifact
 * deterministico, validato contro `99-fonti.md`). Lo importiamo come JSON
 * (`resolveJsonModule` è attivo in `tsconfig.base.json`).
 *
 * Le funzioni sono pure e side-effect-free: l'API restituisce sempre copie
 * difese dai mutamenti esterni (l'utente non deve poter sporcare il bundle).
 */
import type { Lesson, Phase } from './schema.js';
import { PHASE_RANGES } from './schema.js';
// Import del bundle generato. `resolveJsonModule` + `assertion` per SvelteKit/vite.
import bundle from './bundle.json' with { type: 'json' };

/** Struttura del bundle su disco (mirata dal build). */
interface Bundle {
  version: number;
  generatedAt: string | null;
  lessons: Lesson[];
  extras: Lesson[];
}

const data = bundle as Bundle;

/** Tutte le lezioni principali (1..21), ordinate per giorno. */
export function getAllLessons(): Lesson[] {
  return data.lessons.map(cloneLesson);
}

/** Tutte le lezioni extra adattive (7.5 / 14.5), ordinate per giorno. */
export function getExtras(): Lesson[] {
  return data.extras.map(cloneLesson);
}

/** Lezione per giorno (1..21 oppure 7.5 / 14.5), o null se non esiste. */
export function getLesson(day: number): Lesson | null {
  const all = [...data.lessons, ...data.extras];
  const found = all.find((l) => l.day === day);
  return found ? cloneLesson(found) : null;
}

/** Fasi del percorso con range di giorni, in ordine. */
export function getPhases(): readonly { phase: Phase; dayRange: [number, number] }[] {
  return PHASE_RANGES;
}

/**
 * Carica il bundle completo (lesson + extras), ordinato per giorno.
 * Utile per la UI che vuole disegnare il Sentiero con eventuali extra.
 */
export function loadBundle(): Lesson[] {
  return [...data.lessons, ...data.extras]
    .map(cloneLesson)
    .sort((a, b) => a.day - b.day);
}

/** Versione del bundle (per diagnostiche). */
export const BUNDLE_VERSION: number = data.version;
/** Timestamp di generazione del bundle (ISO), o null. */
export const BUNDLE_GENERATED_AT: string | null = data.generatedAt;

/** Copia difensiva di una lezione (immutabilità dall'esterno). */
function cloneLesson(l: Lesson): Lesson {
  return {
    day: l.day,
    phase: l.phase,
    title: l.title,
    durationMin: l.durationMin,
    sources: l.sources.map((s) => ({ ...s })),
    practice: {
      type: l.practice.type,
      steps: [...l.practice.steps],
    },
    body: l.body,
  };
}

// Re-export dei tipi e helpers principali
export type { Lesson, Phase, PracticeType, Practice, Source } from './schema.js';
export { PHASE_LABEL } from './schema.js';
export { validateLesson, normalizePhase } from './schema.js';
export { parseWikiSources, slugify } from './sources.js';
export { parseFrontmatter } from './frontmatter.js';
export type { ParsedFile, YamlValue } from './frontmatter.js';
export { buildBundle, serializeBundle } from './build.js';
export type { LessonInput, BuildResult } from './build.js';
export { shouldInsertRecallExtra, ADAPTIVE_ENABLED } from './adaptive.js';

// ---- Reality check prompts (§S5-1) ----
export { getRealityCheckPrompts } from './reality-checks.js';
export type { RCPrompt, RCPromptCategory } from './reality-checks.js';
