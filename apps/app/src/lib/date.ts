/**
 * date.ts — utility locali per il raggruppamento "per luna" (mese) e la
 * formattazione delle date in italiano. Nessuna dipendenza esterna.
 */

/**
 * Chiave mese nel formato `YYYY-MM` (es. `2026-07`). Derivata da una data
 * `YYYY-MM-DD` leggendo solo anno e mese (no timezone shift).
 */
export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/**
 * Raggruppa i sogni per mese (desc), restituendo una lista di "lune":
 * [{ key, label, dreams }], dove `label` è il nome del mese in italiano +
 * anno breve (es. "luglio ’26"). La prima luna è la più recente.
 */
export interface Moon {
  key: string;
  label: string;
  count: number;
}

const MONTHS_IT = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];

/** Etichetta umana per una chiave `YYYY-MM`. */
export function monthLabel(key: string): string {
  const yearStr = key.slice(0, 4);
  const monthStr = key.slice(5, 7);
  const yearNum = Number(yearStr);
  const monthNum = Number(monthStr);
  if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) return key;
  const month = MONTHS_IT[monthNum - 1] ?? key;
  const yearShort = Number.isFinite(yearNum) ? `'${String(yearNum).slice(-2)}` : '';
  return `${month} ${yearShort}`.trim();
}

/**
 * Costruisce la lista delle lune a partire dai sogni (già ordinati DESC).
 * Restituisce le lune uniche, dalla più recente alla più vecchia, con conteggio.
 */
export function buildMoons(dreamsOn: string[]): Moon[] {
  const counts = new Map<string, number>();
  for (const d of dreamsOn) {
    const k = monthKey(d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, count]) => ({ key, label: monthLabel(key), count }));
}

/** Conta i sogni che cadono nel mese corrente (oggi). */
export function countThisMoon(dreamsOn: string[], today = new Date()): number {
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const cur = `${y}-${m}`;
  return dreamsOn.filter((d) => monthKey(d) === cur).length;
}

/** Formatta una data `YYYY-MM-DD` in italiano breve: "5 lug 2026". */
export function formatDreamDate(dateStr: string): string {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateStr;
  const [, y, mo, d] = m;
  if (!y || !mo || !d) return dateStr;
  const monthNum = Number(mo);
  if (monthNum < 1 || monthNum > 12) return dateStr;
  const short = MONTHS_IT[monthNum - 1]?.slice(0, 3) ?? mo;
  return `${Number(d)} ${short} ${y}`;
}
