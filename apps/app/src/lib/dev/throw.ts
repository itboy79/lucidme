/** Dev-only: bottone "trigger errore" per verificare che Sentry scrubbi correttamente.
 * Contiene volutamente un oggetto con `body`/`title`/`dreamText` per testare lo scrub. */
export function triggerDevError(): void {
  if (import.meta.env.DEV === false && import.meta.env.PROD === true) {
    // attivo anche in preview/prod build per smoke test manuale; disattivare dopo Step 9.
  }
  const payload = {
    body: 'contenuto sensibile del sogno che NON deve apparire in Sentry',
    title: 'titolo sogno segreto',
    dreamText: 'testo onirico privato',
    safe: 'questo campo può passare',
  };
  throw new Error('Dev smoke test: verificare che body/title/dreamText siano [REDACTED] in Sentry. payload=' + JSON.stringify(payload));
}
