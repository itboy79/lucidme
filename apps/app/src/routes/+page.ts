import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

/**
 * Home "/" → /giardino (sezione di default, come `go('giardino')` del prototipo).
 * `base` esplicito: durante l'idratazione iniziale il redirect NON viene
 * prefissato automaticamente dal kit (deploy sotto /app), e un path nudo
 * causerebbe una navigazione full-page fuori dalla PWA.
 */
export function load(): never {
  throw redirect(307, `${base}/giardino`);
}
