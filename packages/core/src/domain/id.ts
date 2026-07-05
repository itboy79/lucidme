/**
 * Generatore ULID (spec-compliant) locale.
 *
 * Perché non la dipendenza `ulid`? In questo step del monorepo non possiamo
 * eseguire `pnpm install` (vincolo pipeline): la dipendenza non sarebbe
 * risolvibile a runtime/typecheck. Implementiamo qui un generatore ULID
 * conforme alla specifica (https://github.com/ulid/spec):
 *  - 26 caratteri in Crockford base32 (0-9, A-Z esclusi I, L, O, U)
 *  - primi 10 char = tempo in millisecondi (monotonico crescente)
 *  - restanti 16 char = entropia casuale
 *
 * Compatibile a livello di stringa con la lib `ulid` (stesso alfabeto, stessa
 * lunghezza, stesso ordinamento). `package.json` tiene comunque `ulid` come
 * dipendenza per chi volesse swappare (basta cambiare l'import).
 */

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford, no I/L/O/U
const ENCODING_LEN = 32n;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

function encodeTime(now: number, len: number): string {
  let time = BigInt(now);
  let out = '';
  for (let i = 0; i < len; i++) {
    const mod = Number(time % ENCODING_LEN);
    out = ENCODING.charAt(mod) + out;
    time = time / ENCODING_LEN;
  }
  return out;
}

function randomChar(): string {
  // Usa getRandomValues se disponibile (crypto), altrimenti Math.random.
  const n = secureRandomInt(32);
  return ENCODING.charAt(n);
}

let cryptoBuf: Uint8Array | null = null;
let cryptoIdx = 0;

function secureRandomInt(max: number): number {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    if (cryptoBuf === null || cryptoIdx >= cryptoBuf.length) {
      cryptoBuf = globalThis.crypto.getRandomValues(new Uint8Array(256));
      cryptoIdx = 0;
    }
    const b = cryptoBuf[cryptoIdx++] ?? 0;
    return b % max; // leggero modulo bias accettabile per un id locale
  }
  return Math.floor(Math.random() * max);
}

function encodeRandom(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) out += randomChar();
  return out;
}

/**
 * Genera un ULID. Monotono rispetto al tempo wall-clock: a parità di ms,
 * l'ordinamento dipende dall'entropia (non garantito stretto, ma sufficiente
 * per il seed deterministico — che non dipende dall'ordine).
 */
export function ulid(): string {
  return encodeTime(Date.now(), TIME_LEN) + encodeRandom(RANDOM_LEN);
}
