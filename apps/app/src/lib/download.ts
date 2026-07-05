/**
 * download.ts — download di un blob sul web (Blob + anchor).
 *
 * Su nativo (Capacitor) si userebbe @capacitor/filesystem; qui copriamo il
 * path web, che è quello di PWA e dev. L'API è defensive: se `URL.createObjectURL`
 * non esiste, ritorna false senza lanciare.
 */

export interface DownloadOpts {
  filename: string;
  mime: string;
  /** Contenuto testuale (per JSON/Markdown). */
  text: string;
}

/**
 * Avvia il download di un file di testo. Ritorna `true` se l'ancora è stata
 * creata con successo, `false` se l'ambiente non lo supporta.
 */
export function downloadText({ filename, mime, text }: DownloadOpts): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return false;
  }
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Libera l'oggetto URL dopo un tick (il download è partito).
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* no-op */
      }
    }, 0);
    return true;
  } catch {
    return false;
  }
}
