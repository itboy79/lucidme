import { redirect } from '@sveltejs/kit';

/** Home "/" → /giardino (sezione di default, come `go('giardino')` del prototipo). */
export function load(): never {
  throw redirect(307, '/giardino');
}
