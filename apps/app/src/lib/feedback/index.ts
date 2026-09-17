/**
 * feedback — invio feedback dei beta tester (ticket S9-2).
 *
 * Regole:
 *  - Attivo SOLO se `PUBLIC_BETA === 'true'` (build beta; in prod il bottone
 *    non esiste).
 *  - Nessuna cattura screenshot: il ticket originale la prevedeva, ma un
 *    screenshot del DOM rischia di includere il body dei sogni (regola
 *    §8.5.4). Testo libero dell'utente, NIENTE screenshot. Deviazione
 *    documentata nella wiki (roadmap/step-09-beta.md).
 *  - Se `PUBLIC_FEEDBACK_ENDPOINT` è configurato → POST JSON
 *    { text, appVersion, sentAt }. Altrimenti la voce viene accodata in
 *    localStorage (la coda verrà svuotata dal primo invio riuscito).
 *  - Invio best-effort: un fallimento non rompe mai la UX.
 */

/** Voce di feedback: testo libero UTENTE (mai contenuto sogni letto dal DB). */
export interface FeedbackEntry {
  text: string;
  sentAt: string;
}

interface PublicEnv {
  PUBLIC_BETA?: string;
  PUBLIC_FEEDBACK_ENDPOINT?: string;
}

const QUEUE_KEY = 'lucidme:feedback:queue';

function readEnv(): PublicEnv {
  const fromMeta = (import.meta as unknown as { env?: PublicEnv }).env;
  const fromProcess =
    typeof process !== 'undefined' ? (process as unknown as { env?: PublicEnv }).env : undefined;
  return {
    PUBLIC_BETA: fromMeta?.PUBLIC_BETA ?? fromProcess?.PUBLIC_BETA,
    PUBLIC_FEEDBACK_ENDPOINT:
      fromMeta?.PUBLIC_FEEDBACK_ENDPOINT ?? fromProcess?.PUBLIC_FEEDBACK_ENDPOINT,
  };
}

/** True solo nelle build beta (il bottone feedback esiste solo lì). */
export function isBetaBuild(): boolean {
  return readEnv().PUBLIC_BETA === 'true';
}

function readQueue(): FeedbackEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FeedbackEntry[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: FeedbackEntry[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // private mode: la coda è best-effort.
  }
}

export function queueSize(): number {
  return readQueue().length;
}

/**
 * Invia il feedback: POST all'endpoint se configurato, altrimenti accoda.
 * Ritorna 'sent' | 'queued' (mai throw: errori → 'queued').
 * Prima di rispondere tenta anche lo svuotamento della coda precedente.
 */
export async function sendFeedback(text: string): Promise<'sent' | 'queued'> {
  const entry: FeedbackEntry = { text, sentAt: new Date().toISOString() };
  const endpoint = readEnv().PUBLIC_FEEDBACK_ENDPOINT;
  if (!endpoint) {
    writeQueue([...readQueue(), entry]);
    return 'queued';
  }
  try {
    const pending = [...readQueue(), entry];
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pending),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    writeQueue([]); // coda svuotata dopo invio riuscito
    return 'sent';
  } catch {
    writeQueue([...readQueue(), entry]);
    return 'queued';
  }
}
