import { env } from '$env/dynamic/public';
import { version } from '$app/environment';
import type { HandleClientError } from '@sveltejs/kit';
import { isScrubField } from '@lucidme/core';

const SENTRY_DSN = env.PUBLIC_SENTRY_DSN;
const APP_ENV = env.PUBLIC_ENV || 'dev';

// Sentry init solo se DSN presente. In dev senza DSN non invia nulla.
if (SENTRY_DSN) {
  const { init, setUser } = await import('@sentry/sveltekit');
  init({
    dsn: SENTRY_DSN,
    environment: APP_ENV,
    release: version,
    // Scrub aggressivo: rimuove SEMPRE qualsiasi campo con nome sospetto
    // (corpi/titoli/transcript dei sogni — regola wiki §8.5.4).
    beforeSend(event) {
      return scrubEvent(event);
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.type === 'http' && breadcrumb.data) {
        delete breadcrumb.data['body'];
      }
      return breadcrumb;
    },
    defaultIntegrations: false,
    tracesSampleRate: 0.1,
  });
  setUser(null);
}

/** Rimuove ricorsivamente dai Sentry event ogni campo elencato in SCRUB_FIELDS. */
function scrubEvent<T>(node: T): T {
  if (Array.isArray(node)) {
    return node.map((n) => scrubEvent(n)) as unknown as T;
  }
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (isScrubField(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = scrubEvent(v);
      }
    }
    return out as T;
  }
  return node;
}

export const handleError: HandleClientError = async ({ error, event }) => {
  if (SENTRY_DSN) {
    const { captureException } = await import('@sentry/sveltekit');
    captureException(error, {
      extra: { route_id: event.route?.id ?? 'unknown' },
    });
  }
  console.error('[Lucid Me] client error:', error);
  return {
    message: 'Qualcosa è andato storto. Il tuo diario è salvo — nessun dato è stato perso.',
  };
};
