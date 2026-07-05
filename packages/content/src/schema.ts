/**
 * Schema del Sentiero (§S3-1).
 *
 * Niente zod: validatore piccolo e mirato. La regola bloccante del ticket è
 * "il build DEVE fallire se una `ref` non esiste in `99-fonti.md`". Per le fasi
 * ≠ "fondamenti" le `sources` non possono essere vuote (ogni claim vuole fonte).
 *
 * Tipo `day`: 1..21, oppure 7.5 / 14.5 per gli extra adattivi (7bis, 14bis).
 * Li teniamo come `number`: 7.5 < 8 quindi ordinano correttamente tra 7 e 8.
 */

/** Le quattro fasi del Sentiero (struttura vincolata, §S3-2). */
export type Phase = 'fondamenti' | 'reality-testing' | 'mild-wbtb' | 'tlr';

/** Tipo di pratica per la lezione (driver il LessonPlayer, §S3-4). */
export type PracticeType = 'lettura' | 'esercizio' | 'audio';

/** Riferimento a una fonte. `ref` è la chiave stabile in `99-fonti.md`. */
export interface Source {
  label: string;
  ref: string;
}

/** Pratica: tipo + step (gli step guidano il player esercizio/audio). */
export interface Practice {
  type: PracticeType;
  steps: string[];
}

/** Lezione del Sentiero. */
export interface Lesson {
  /** 1..21 oppure 7.5 / 14.5 per extra adattivi. */
  day: number;
  phase: Phase;
  title: string;
  /** Durata percepita in minuti (copy "· 6 min"). */
  durationMin: number;
  sources: Source[];
  practice: Practice;
  /** Corpo markdown (sottoinsieme: headings, paragrafi, **bold**, liste). */
  body: string;
}

/** Nomi di fase leggibili, in italiano, per l'UI. */
export const PHASE_LABEL: Record<Phase, string> = {
  fondamenti: 'fondamenti',
  'reality-testing': 'reality testing',
  'mild-wbtb': 'MILD → WBTB',
  tlr: 'TLR',
};

/** Tutte le fasi nell'ordine del percorso, con range di giorni. */
export const PHASE_RANGES: readonly { phase: Phase; dayRange: [number, number] }[] = [
  { phase: 'fondamenti', dayRange: [1, 3] },
  { phase: 'reality-testing', dayRange: [4, 10] },
  { phase: 'mild-wbtb', dayRange: [11, 16] },
  { phase: 'tlr', dayRange: [17, 21] },
];

const PHASES: ReadonlySet<Phase> = new Set([
  'fondamenti',
  'reality-testing',
  'mild-wbtb',
  'tlr',
]);
const PRACTICE_TYPES: ReadonlySet<PracticeType> = new Set([
  'lettura',
  'esercizio',
  'audio',
]);

/**
 * Alias di fase accettati nel frontmatter e normalizzati al valore canonico.
 * `fondamenta` (forma usata negli esempi del ticket) → `fondamenti`.
 */
const PHASE_ALIASES: Readonly<Record<string, Phase>> = {
  fondamenti: 'fondamenti',
  fondamenta: 'fondamenti', // alias: forma singolare usata negli esempi
};

/** Normalizza una fase (alias → canonica). undefined se non riconosciuta. */
export function normalizePhase(p: string): Phase | undefined {
  return PHASE_ALIASES[p] ?? (PHASES.has(p as Phase) ? (p as Phase) : undefined);
}

/**
 * Valida una lezione contro lo schema. Ritorna la lista degli errori (vuota = ok).
 * La verifica che ogni `ref` esista nelle fonti wiki è delegata al chiamante
 * (che ha il Set delle chiavi parseate da `99-fonti.md`): vedi `build.ts`.
 */
export function validateLesson(
  lesson: unknown,
  knownSources?: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  if (typeof lesson !== 'object' || lesson === null) {
    return ['lezione non è un oggetto'];
  }
  const l = lesson as Record<string, unknown>;

  // day: number, 1..21 oppure 7.5 / 14.5
  if (typeof l.day !== 'number' || !Number.isFinite(l.day)) {
    errors.push('day mancante o non numerico');
  } else {
    const d = l.day;
    const okMain = d >= 1 && d <= 21 && Number.isInteger(d);
    const okExtra = d === 7.5 || d === 14.5;
    if (!okMain && !okExtra) {
      errors.push(`day=${d} non valido (1..21 oppure 7.5 / 14.5)`);
    }
  }

  // phase (con normalizzazione alias)
  if (typeof l.phase !== 'string' || normalizePhase(l.phase) === undefined) {
    errors.push(`phase="${String(l.phase)}" non valida`);
  } else if (normalizePhase(l.phase) !== l.phase) {
    // riscrivi sul valore canonico così il bundle è uniforme
    l.phase = normalizePhase(l.phase);
  }

  // title
  if (typeof l.title !== 'string' || l.title.trim() === '') {
    errors.push('title mancante o vuoto');
  }

  // durationMin
  if (typeof l.durationMin !== 'number' || l.durationMin <= 0) {
    errors.push('durationMin mancante o <= 0');
  }

  // sources: array di {label, ref}; non vuoto se phase !== 'fondamenti'
  if (!Array.isArray(l.sources)) {
    errors.push('sources non è un array');
  } else {
    if (l.sources.length === 0 && l.phase !== 'fondamenti') {
      errors.push('sources vuoto per fase ≠ fondamenta (serve fonte)');
    }
    l.sources.forEach((s, i) => {
      if (typeof s !== 'object' || s === null) {
        errors.push(`sources[${i}] non è un oggetto`);
        return;
      }
      const src = s as Record<string, unknown>;
      if (typeof src.label !== 'string' || src.label.trim() === '') {
        errors.push(`sources[${i}].label mancante`);
      }
      if (typeof src.ref !== 'string' || src.ref.trim() === '') {
        errors.push(`sources[${i}].ref mancante`);
      } else if (knownSources && !knownSources.has(src.ref)) {
        errors.push(`sources[${i}].ref="${src.ref}" non presente in 99-fonti.md`);
      }
    });
  }

  // practice
  if (typeof l.practice !== 'object' || l.practice === null) {
    errors.push('practice mancante');
  } else {
    const p = l.practice as Record<string, unknown>;
    if (typeof p.type !== 'string' || !PRACTICE_TYPES.has(p.type as PracticeType)) {
      errors.push(`practice.type="${String(p.type)}" non valido`);
    }
    if (!Array.isArray(p.steps)) {
      errors.push('practice.steps non è un array');
    } else {
      if (p.steps.length === 0) {
        errors.push('practice.steps vuoto');
      }
      p.steps.forEach((st, i) => {
        if (typeof st !== 'string' || st.trim() === '') {
          errors.push(`practice.steps[${i}] vuoto`);
        }
      });
    }
  }

  // body
  if (typeof l.body !== 'string' || l.body.trim() === '') {
    errors.push('body mancante o vuoto');
  }

  return errors;
}
