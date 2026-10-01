/**
 * brand.ts — isolamento del nome prodotto (working name, D-008 pending).
 *
 * Il wordmark compare nel DOM negli span `[data-app-name]` e nel <title>;
 * questo modulo li riallinea alla costante. Il rebrand è 1 riga: cambiare
 * APP_NAME (più i meta OG statici in index.html, vedi TODO(D-008) lì).
 */
export const APP_NAME = 'Vigilia';

/** Titolo del documento, composto dal solo punto in cui il nome è definito. */
export function pageTitle(): string {
  return `${APP_NAME} — diario per i sogni lucidi`;
}

/** Applica il wordmark a tutti gli span [data-app-name] + al <title>. */
export function applyBrand(): void {
  document.title = pageTitle();
  document
    .querySelectorAll<HTMLElement>('[data-app-name]')
    .forEach((el) => {
      el.textContent = APP_NAME;
    });
}
