/**
 * navigation — wrapper di goto/$app/navigation consapevole del base path.
 *
 * Quando l'app è deployata sotto una sotto-cartella (KIT_BASE=/app, deploy
 * self-hosted), ogni navigazione e ogni path assoluto di asset va prefissato
 * con `base`. I call-site usano SEMPRE path "di app" ('/giardino'): il prefisso
 * lo aggiunge solo questo modulo. Con base '' (dev, e2e, Capacitor) è un
 * pass-through e nulla cambia.
 */
import { goto as kitGoto } from '$app/navigation';
import { base } from '$app/paths';

/** goto(path) con base path applicato — stessa firma di $app/navigation. */
export function goto(path: string, opts?: Parameters<typeof kitGoto>[1]): Promise<void> {
  return kitGoto(`${base}${path}`, opts);
}

/** Rende assoluto (col base) un path di asset ('/audio/…', '/icons/…'). */
export function withBase(path: string): string {
  return `${base}${path}`;
}

export { base };
