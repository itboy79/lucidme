/**
 * speech.ts — wrapper minimale sulla Web Speech API per la dettatura `it-IT`.
 *
 * Feature-detect (no error se assente): `speechSupported()` controlla
 * `SpeechRecognition`/`webkitSpeechRecognition` su window. L'app nasconde il
 * bottone registrazione quando non supportato (Firefox/Android WebView).
 *
 * Il tipo `SpeechRecognition` non è nelle lib.dom standard TS; definiamo qui
 * una superficie minimale (i soli campi/eventi che usiamo) per restare in
 * strict mode senza `any`.
 */

/** Superficie minima della Web Speech API che usiamo. */
export interface MinimalSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export interface SpeechRecognitionResultEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

/** Costruttore del riconoscitore: `new () => MinimalSpeechRecognition`. */
type SpeechCtor = new () => MinimalSpeechRecognition;

function getSpeechCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** True se il browser espone la Web Speech API. */
export function speechSupported(): boolean {
  return getSpeechCtor() !== null;
}

/**
 * Crea un riconoscitore `it-IT` con risultati finali + interim. Restituisce
 * `null` se l'API non è disponibile (il caller deve già aver controllato
 * `speechSupported()`, ma questo resta defensive).
 */
export function createRecognizer(): MinimalSpeechRecognition | null {
  const Ctor = getSpeechCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = 'it-IT';
  rec.continuous = true;
  rec.interimResults = true;
  return rec;
}

/**
 * Estrae il testo accumulato da un evento risultato, dal `resultIndex` in poi.
 * Usa `final` quando disponibile, altrimenti i risultati interim.
 */
export function transcriptFromEvent(
  e: SpeechRecognitionResultEventLike,
  fromIndex: number,
): string {
  let text = '';
  for (let i = fromIndex; i < e.results.length; i++) {
    const row = e.results[i];
    if (!row) continue;
    const first = row[0];
    if (first) text += first.transcript;
  }
  return text.trim();
}
