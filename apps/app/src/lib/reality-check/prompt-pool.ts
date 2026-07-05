/**
 * Prompt pool dei reality check (§S5-2 step 3).
 *
 * Selezione prompt deterministica:
 *  - shuffle del pool con PRNG seeded (così il piano del giorno è stabile);
 *  - cursore persistito (in SettingsRepo) → ogni prompt esce una volta prima
 *    che il pool si ripeta;
 *  - vincoli applicati dal `scheduler.planDay`: mai stesso prompt due volte
 *    nello stesso giorno, mai stessa categoria due volte di fila.
 *
 * Il cursore globale (tra giorni) è persistito in `settings` sotto la chiave
 * `rc_cursor`; lo incrementiamo man mano che consumiamo prompt.
 */
import { getRealityCheckPrompts } from '@lucidme/content';
import type { RCPrompt, RCPromptCategory } from '@lucidme/content';
import { mulberry32 } from '@lucidme/generative';

/** Pool statico (60 prompt). */
const POOL: readonly RCPrompt[] = getRealityCheckPrompts();

/** Shuffle Fisher–Yates deterministico via PRNG seeded. */
function shuffleSeeded<T>(arr: readonly T[], rnd: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = out[i];
    out[i] = out[j] as T;
    out[j] = tmp as T;
  }
  return out;
}

/**
 * Seleziona `count` prompt per una giornata, partendo dal cursore globale,
 * rispettando:
 *  - nessun prompt ripetuto in-day (la pool è > count, sempre possibile);
 *  - nessuna categoria ripetuta due volte di fila.
 *
 * Usa un PRNG seeded dal seed del giorno (per idempotenza: stesso seed → stesso
 * piano). Ritorna gli id selezionati (in ordine) e il nuovo valore del cursore.
 *
 * Algoritmo:
 *  1. shuffle della pool col seed;
 *  2. partendo da `cursor`, scorri cercando il prossimo prompt che non violi i
 *     vincoli (categoria ≠ precedente; non già usato oggi);
 *  3. wrap-around sulla pool (idempotente del cursore mod pool.length);
 *  4. aggiorna cursore.
 */
export function selectPrompts(
  count: number,
  cursor: number,
  seed: number,
): { promptIds: string[]; nextCursor: number } {
  const rnd = mulberry32(seed);
  const shuffled = shuffleSeeded(POOL, rnd);
  const n = shuffled.length;

  const promptIds: string[] = [];
  const usedIds = new Set<string>();
  let lastCat: RCPromptCategory | null = null;
  let pos = ((cursor % n) + n) % n;

  // Tentativo lineare: scorriamo la pool shuffled a partire da `pos`, wrap-around.
  // Se non troviamo un prompt valido dopo 2*n iterazioni, rilassiamo il vincolo
  // di categoria (mai però ripetere un prompt in-day).
  let relaxCategory = false;
  let iters = 0;
  while (promptIds.length < count && iters < n * 3) {
    const cand = shuffled[pos % n];
    pos = (pos + 1) % n;
    iters++;
    if (!cand) continue;
    if (usedIds.has(cand.id)) continue;
    if (!relaxCategory && lastCat !== null && cand.category === lastCat) {
      // prova ancora (mantieni il vincolo finché possibile)
      continue;
    }
    promptIds.push(cand.id);
    usedIds.add(cand.id);
    lastCat = cand.category;
    // se stiamo faticando troppo (mezza pool scorsa senza riempire), rilassa
    if (iters > n && promptIds.length < count) {
      relaxCategory = true;
    }
  }

  // cursore avanzato di `count` posizioni nella pool originale (mod n)
  const nextCursor = (cursor + count) % n;
  return { promptIds, nextCursor };
}

/** Helper: ritorna la definizione prompt per id, o null. */
export function getPromptById(id: string): RCPrompt | null {
  return POOL.find((p) => p.id === id) ?? null;
}

/** Esposto per test: la pool (sola lettura). */
export function poolSize(): number {
  return POOL.length;
}

/** Chiave settings del cursore. */
export const RC_CURSOR_KEY = 'rc_cursor';
