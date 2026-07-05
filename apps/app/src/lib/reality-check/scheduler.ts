/**
 * Scheduler dei reality check (§S5-2).
 *
 * Algoritmo ESATTO (nessuna variante):
 *  1. Config utente: finestra [start=09:00, end=21:00] in minuti, n=4 al giorno
 *     (min 2, max 8).
 *  2. Build 15-min slots in [startMin, endMin].
 *  3. Sample `count` slot uniformemente senza sostituzione via PRNG seeded
 *     (mulberry32). Vincolo: distanza minima 75 min tra due check; se violato,
 *     resample (bounded retries), poi relax (accetta la miglior selezione).
 *  4. Selezione prompt: shuffle deterministico, cursore persistito; mai stesso
 *     prompt due volte nello stesso giorno; mai stessa categoria due volte di fila.
 *  5. seed = hashStr(userId + dateYYYYMMDD) → idempotente stesso giorno.
 *
 * Tutta la logica è pura (nessun side-effect): `planDay` ritorna il piano;
 * `scheduleAll` lo materializza via il backend di notifica (riusa `lib/alarm`).
 */
import { hashStr, mulberry32 } from '@lucidme/generative';
import type { AlarmBackend } from '$lib/alarm/types.js';
import { ALARM_ID_RC_BASE } from '$lib/alarm/types.js';
import { selectPrompts } from './prompt-pool.js';

/** Config utente per la pianificazione giornaliera. */
export interface RCConfig {
  /** Inizio finestra in minuti da mezzanotte (default 540 = 09:00). */
  startMin: number;
  /** Fine finestra in minuti (default 1260 = 21:00). */
  endMin: number;
  /** Numero di check al giorno (2..8, default 4). */
  count: number;
}

export const RC_DEFAULTS: RCConfig = {
  startMin: 9 * 60, // 09:00
  endMin: 21 * 60, // 21:00
  count: 4,
};

/** Distanza minima in minuti tra due check. */
export const RC_MIN_DISTANCE_MIN = 75;
/** Durata di uno slot in minuti. */
export const RC_SLOT_MIN = 15;
/** Numero massimo di ritenti di resample prima di rilassare il vincolo. */
const RC_RESAMPLE_RETRIES = 200;

/** Un piano giornaliero: orari (minuti) + id prompt (allineati per indice). */
export interface DayPlan {
  minutes: number[];
  promptIds: string[];
}

/** Clamp count in [2,8] e finestra valida. */
function normalize(config: RCConfig): RCConfig {
  const count = Math.max(2, Math.min(8, config.count));
  const startMin = Math.max(0, Math.min(24 * 60 - 1, config.startMin));
  const endMin = Math.max(startMin + RC_MIN_DISTANCE_MIN, Math.min(24 * 60, config.endMin));
  return { startMin, endMin, count };
}

/** Costruisce gli slot da 15 min in [startMin, endMin] (estremi inclusi). */
function buildSlots(startMin: number, endMin: number): number[] {
  const slots: number[] = [];
  // primo slot allineato a RC_SLOT_MIN dopo mezzanotte, >= startMin
  let s = Math.ceil(startMin / RC_SLOT_MIN) * RC_SLOT_MIN;
  while (s <= endMin) {
    slots.push(s);
    s += RC_SLOT_MIN;
  }
  return slots;
}

/**
 * Sample di `count` slot senza sostituzione, uniforme, con vincolo di distanza
 * minima. Implementazione: sorteggio Fisher–Yates parziale + check distanza;
 * resample con nuovo consumo del PRNG se violato, bounded retries; se dopo
 * `RC_RESAMPLE_RETRIES` non troviamo una selezione valida, rilassiamo togliendo
 * il vincolo (best-effort, documentato). Il PRNG è seeded → deterministico.
 */
function sampleSlots(
  slots: number[],
  count: number,
  rnd: () => number,
): number[] {
  if (count >= slots.length) {
    // richiediamo più check degli slot: ritorniamo tutti (rilassato)
    return [...slots].sort((a, b) => a - b);
  }

  let best: number[] = [];
  for (let attempt = 0; attempt < RC_RESAMPLE_RETRIES; attempt++) {
    // Fisher–Yates parziale: peschiamo `count` elementi senza sostituzione.
    const pool = [...slots];
    const picked: number[] = [];
    for (let i = 0; i < count; i++) {
      const j = Math.floor(rnd() * pool.length);
      picked.push(pool.splice(j, 1)[0] as number);
    }
    picked.sort((a, b) => a - b);
    if (minDistanceOk(picked)) {
      return picked;
    }
    // tieni traccia della miglior selezione (massima distanza minima)
    if (picked.length === count) best = picked;
  }
  // relax: ritorna l'ultimo tentativo (vincolo NON rispettato, ma count ok).
  // Questo caso è raro: con finestra 09:00–21:00 e n=4, lo spazio è ampio.
  return best.sort((a, b) => a - b);
}

/** True se ogni coppia consecutiva dista almeno RC_MIN_DISTANCE_MIN. */
function minDistanceOk(mins: number[]): boolean {
  for (let i = 1; i < mins.length; i++) {
    if ((mins[i] ?? 0) - (mins[i - 1] ?? 0) < RC_MIN_DISTANCE_MIN) return false;
  }
  return true;
}

/**
 * Pianifica la giornata. `seed` deve essere `hashStr(userId + dateYYYYMMDD)`.
 * `cursor` è il cursore globale del prompt pool (persistito).
 *
 * Idempotente: stesso (config, seed, cursor) → stesso piano.
 */
export function planDay(
  config: RCConfig,
  seed: number,
  cursor: number,
): DayPlan {
  const cfg = normalize(config);
  const slots = buildSlots(cfg.startMin, cfg.endMin);

  // PRNG seeded dal seed del giorno. NOTA: consumiamo un flusso PRNG separato per
  // lo slot sampling e uno per il prompt shuffle (in prompt-pool), così cambia-
  // re il count non altera la selezione dei prompt e viceversa.
  const slotRnd = mulberry32(seed ^ 0x515c01); // XOR costante per decorrelare
  const minutes = sampleSlots(slots, cfg.count, slotRnd);

  // Selezione prompt con seed distinto (shift diverso) per decorrelare.
  const promptSeed = seed ^ 0x7263530a;
  const { promptIds } = selectPrompts(cfg.count, cursor, promptSeed);

  return { minutes, promptIds };
}

/**
 * Costruisce il seed del giorno: `hashStr(userId + dateYYYYMMDD)`.
 * Esportato per test e per la UI che deve chiamare planDay.
 */
export function daySeed(userId: string, dateYYYYMMDD: string): number {
  return hashStr(`${userId}${dateYYYYMMDD}`);
}

/**
 * Converte minuti-da-mezzanotte in un `Date` per il giorno dato (YYYY-MM-DD),
 * in timezone locale del device. `dateStr` è 'YYYY-MM-DD'.
 */
export function minuteToDate(dateStr: string, minute: number): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) {
    throw new Error(`minuteToDate: data malformata "${dateStr}"`);
  }
  const date = new Date(y, m - 1, d, 0, 0, 0, 0);
  date.setMinutes(minute);
  return date;
}

/**
 * Materializza il piano via il backend di notifica: pianifica `count` allarmi.
 * Gli id partono da `ALARM_ID_RC_BASE`. Usa il backend iniettato (nativo o web).
 */
export async function scheduleAll(
  plan: DayPlan,
  dateStr: string,
  backend: AlarmBackend,
): Promise<void> {
  for (let i = 0; i < plan.minutes.length; i++) {
    const min = plan.minutes[i];
    const promptId = plan.promptIds[i];
    if (min === undefined || promptId === undefined) continue;
    const at = minuteToDate(dateStr, min);
    const id = ALARM_ID_RC_BASE + i;
    await backend.schedule(id, at, {
      title: 'Reality check',
      body: 'Sei sveglio, adesso?',
      vibrate: false,
    });
  }
}

/** Cancella tutti gli allarmi RC pianificati (fino a 8). */
export async function cancelAll(backend: AlarmBackend): Promise<void> {
  for (let i = 0; i < 8; i++) {
    await backend.cancel(ALARM_ID_RC_BASE + i);
  }
}
