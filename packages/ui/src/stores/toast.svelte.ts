/**
 * Store toast — coda 1 messaggio, durata 2200ms (come `toast()` del prototipo,
 * riga 389). API minimale con rune Svelte 5: `toastState` è un `$state` oggetto,
 * `show(msg)` setta il messaggio e programmi il reset.
 *
 * Importato dal componente Toast.svelte e da qualunque caller (bottoni, azioni).
 */

/** Durata del toast (ms) — copiata dal prototipo (`setTimeout(...,2200)`). */
export const TOAST_DURATION_MS = 2200;

interface ToastState {
  msg: string;
  visible: boolean;
}

/** Stato reattivo (rune). Singolo messaggio alla volta (coda = 1). */
export const toastState: ToastState = $state({ msg: '', visible: false });

let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Mostra un toast. Se ne mostra un secondo mentre il primo è visibile, lo
 * sostituisce (coda 1) e riarmila durata (come il `clearTimeout` del prototipo).
 */
export function show(msg: string): void {
  toastState.msg = msg;
  toastState.visible = true;
  if (timer !== undefined) clearTimeout(timer);
  timer = setTimeout(() => {
    toastState.visible = false;
  }, TOAST_DURATION_MS);
}

/** Nasconde immediatamente il toast (utile per test / dismiss). */
export function hide(): void {
  toastState.visible = false;
  if (timer !== undefined) clearTimeout(timer);
}
