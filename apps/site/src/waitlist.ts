/**
 * waitlist.ts — iscrizione alla beta (S9-1).
 *
 * Stessa filosofia di apps/app/src/lib/feedback/index.ts:
 *  - Se PUBLIC_WAITLIST_ENDPOINT è configurato → POST JSON { email }. SOLO
 *    l'email: nessun altro dato lascia mai il dispositivo.
 *  - Altrimenti (o se l'invio fallisce) la voce viene accodata in
 *    localStorage `lucidme:waitlist`, best-effort con try/catch silenzioso
 *    (private mode / quota non rompono mai la UX).
 *  - Mai throw: il chiamante riceve sempre 'sent' | 'queued'.
 */

/** Voce in coda locale (tracciata solo sul dispositivo). */
interface QueuedEntry {
  email: string;
  at: string;
}

const QUEUE_KEY = 'lucidme:waitlist';

/** Regex semplice: qualcosa@dominio.tld, senza spazi. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Validazione client dell'email (normalizzata: trim prima del test). */
export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

function readQueue(): QueuedEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedEntry[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedEntry[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // private mode: la coda è best-effort.
  }
}

function enqueue(email: string): void {
  writeQueue([
    ...readQueue(),
    { email, at: new Date().toISOString() },
  ]);
}

/**
 * Iscrive un'email alla beta.
 * Ritorna 'sent' (endpoint ha risposto ok) | 'queued' (coda locale).
 */
export async function joinWaitlist(email: string): Promise<'sent' | 'queued'> {
  const clean = email.trim();
  const endpoint = import.meta.env.PUBLIC_WAITLIST_ENDPOINT;

  if (!endpoint) {
    enqueue(clean);
    return 'queued';
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: clean }), // SOLO l'email
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    writeQueue([]); // svuota eventuali code precedenti dopo un invio riuscito
    return 'sent';
  } catch {
    enqueue(clean);
    return 'queued';
  }
}
