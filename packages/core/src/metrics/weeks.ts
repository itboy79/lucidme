/** Helpers puri su date 'YYYY-MM-DD' trattate come date di calendario locali. */

/** Aggiunge n giorni a una data 'YYYY-MM-DD'. */
export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const [y, m, d] = parts;
  if (
    parts.length !== 3 ||
    y === undefined ||
    m === undefined ||
    d === undefined ||
    Number.isNaN(y) ||
    Number.isNaN(m) ||
    Number.isNaN(d)
  ) {
    throw new Error(`data non valida: ${dateStr}`);
  }
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateStr(date);
}

/** Ritorna 'YYYY-MM-DD' di una Date locale. */
export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Ritorna il lunedì (ISO, inizio settimana) della settimana contenente dateStr.
 * getDay(): 0=Domenica ... 6=Sabato. La domenica appartiene alla settimana del lunedì precedente.
 */
export function mondayOf(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const [y, m, d] = parts;
  if (
    parts.length !== 3 ||
    y === undefined ||
    m === undefined ||
    d === undefined ||
    Number.isNaN(y) ||
    Number.isNaN(m) ||
    Number.isNaN(d)
  ) {
    throw new Error(`data non valida: ${dateStr}`);
  }
  const date = new Date(y, m - 1, d);
  const dow = date.getDay(); // 0 dom ... 6 sab
  const offset = dow === 0 ? 6 : dow - 1;
  return addDays(dateStr, -offset);
}

/** True se dateStr cade in [weekStart, weekStart+7giorni). */
export function isInWeek(dateStr: string, weekStart: string): boolean {
  const end = addDays(weekStart, 7);
  return dateStr >= weekStart && dateStr < end;
}

/** Iterable di tutti i lunedì in [fromMonday, toMonday] inclusive. */
export function eachMonday(fromMonday: string, toMonday: string): string[] {
  const out: string[] = [];
  let cur = fromMonday;
  let guard = 0;
  while (cur <= toMonday && guard < 600) {
    out.push(cur);
    cur = addDays(cur, 7);
    guard++;
  }
  return out;
}
