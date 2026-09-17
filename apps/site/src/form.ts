/**
 * form.ts — UI del form waitlist (progressive enhancement).
 *
 * Il form è in HTML statico (funziona anche senza JS per la lettura);
 * qui si gestisce: validazione client con messaggio inline (role=alert),
 * stato di invio (bottone disabilitato) e sostituzione del form con il
 * messaggio di successo a fine invio (focus spostato per gli screen reader).
 */
import { isValidEmail, joinWaitlist } from './waitlist';

export function initWaitlistForm(): void {
  const form = document.querySelector<HTMLFormElement>('#waitlist-form');
  const input = document.querySelector<HTMLInputElement>('#waitlist-email');
  const error = document.querySelector<HTMLElement>('#waitlist-error');
  const success = document.querySelector<HTMLElement>('#waitlist-success');
  const submit = document.querySelector<HTMLButtonElement>('#waitlist-submit');
  if (!form || !input || !error || !success || !submit) return;

  let sending = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;

    if (!isValidEmail(input.value)) {
      input.setAttribute('aria-invalid', 'true');
      error.hidden = false;
      input.focus();
      return;
    }

    input.removeAttribute('aria-invalid');
    error.hidden = true;
    sending = true;
    submit.disabled = true;
    submit.textContent = 'Invio…';
    try {
      // joinWaitlist non lancia mai: fallimenti → coda locale ('queued').
      await joinWaitlist(input.value);
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } finally {
      sending = false;
      submit.disabled = false;
      submit.textContent = 'Avvisami';
    }
  });

  // A nuove digitazioni l'errore si nasconde (non persistere dopo la correzione).
  input.addEventListener('input', () => {
    if (!error.hidden) {
      error.hidden = true;
      input.removeAttribute('aria-invalid');
    }
  });
}
