/**
 * Codici di errore del dominio (§8.3). Union type chiuso per esaurire i casi
 * nei consumer (UI, repo). Nessun errore generico: ognuno ha un `code`.
 */
export type DomainErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT';

/**
 * DomainError — errore di business con `code` strutturato.
 *
 * IMPORTANTE (privacy §8.5.4): NON inserire MAI testo di sogni (body/title)
 * nel `message`. Il messaggio è pensato per log/crash report e finirebbe fuori
 * dispositivo; usare identificatori (id, campo) o messaggi generici.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
    // Mantieni lo stack del costruttore reale (V8); best-effort, ignorato altrove.
    const ctor = Error as unknown as {
      captureStackTrace?: (target: unknown, ctor?: unknown) => void;
    };
    if (typeof ctor.captureStackTrace === 'function') {
      ctor.captureStackTrace(this, DomainError);
    }
  }
}
