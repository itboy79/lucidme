/**
 * `DreamSign` (§8.3) — segno ricorrente (es. "acqua", "volare").
 *
 * v1: solo auto-rilevati (`autoDetected = true`); niente tag manuali (§S2-1).
 * La `label` è sempre normalizzata (lowercase, trim, spazi collassati) così il
 * UNIQUE constraint in DB e il match in `detectSigns` sono coerenti.
 */
export interface DreamSign {
  id: string;
  label: string;
  autoDetected: boolean;
}

/**
 * Normalizza un'etichetta di segno: lowercase, trim, spazi multipli → uno.
 * Esempi: "  Acqua " → "acqua", "Volo  a vela" → "volo a vela".
 */
export function normalizeSignLabel(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}
