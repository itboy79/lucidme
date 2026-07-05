/**
 * Campi da rimuovere SEMPRE da log/analytics/crash report (regola wiki §8.5.4).
 * Nessun testo di sogni deve mai lasciare il device.
 *
 * Lista estendibile: aggiungere qui ogni nuovo campo che può contenere contenuto utente.
 * Usata dallo scrub Sentry (`apps/app/src/hooks.client.ts`) e da qualunque client analitico.
 */
export const SCRUB_FIELDS: readonly string[] = [
  'body',
  'title',
  'transcript',
  'dreamText',
  'dreamBody',
  'dream',
  'text',
  'content',
  'note',
  'notes',
  'description',
] as const;

/** Versione case-insensitive per il matching robusto nelle Sentry breadcrumbs/extras. */
export function isScrubField(key: string): boolean {
  const lower = key.toLowerCase();
  return SCRUB_FIELDS.some((f) => f.toLowerCase() === lower);
}
