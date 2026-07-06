/**
 * client.svelte.ts — singleton di inizializzazione DB per l'app.
 *
 * Apre il database in OPFS (browser production), esegue le migration e
 * restituisce i repository pronti all'uso. La Promise è cacheata: chiamate
 * successive a `getDbClient()` riottengono la stessa istanza.
 *
 * Locale-first: nessuna dipendenza da rete. In caso di backend wa-sqlite
 * assente, `openDb` ricade trasparentemente sullo stub in memoria (vedi
 * `@lucidme/db` client.ts).
 */
import {
  openDb,
  runMigrations,
  DreamRepo,
  SignRepo,
  NightRepo,
  SettingsRepo,
  RCRepo,
  InMemoryDB,
} from '@lucidme/db';
import type { DB } from '@lucidme/db';

export interface DbClient {
  db: DB;
  dreamRepo: DreamRepo;
  signRepo: SignRepo;
  nightRepo: NightRepo;
  settingsRepo: SettingsRepo;
  rcRepo: RCRepo;
}

let cachedPromise: Promise<DbClient> | null = null;

/**
 * Tempo massimo per l'inizializzazione del backend reale (wa-sqlite/OPFS)
 * prima di ricadere sullo stub in memoria. Il backend reale può bloccarsi in
 * contesti non sicuri (wasm non servito, SharedArrayBuffer assente): senza
 * questo guard, le route che attendono il DB resterebbero vuote per sempre.
 * Lo stub NON persiste tra reload, ma consente all'app di funzionare.
 */
const DB_INIT_TIMEOUT_MS = 4000;

/** Apre il DB con un timeout di fallback; mai rigetta, mai pende indefinitamente. */
async function openDbWithFallback(): Promise<DB> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<DB>((resolve) => {
    timer = setTimeout(() => {
      console.warn(
        '[db] init del backend reale non completata in tempo — fallback in memoria (non persistente).',
      );
      resolve(new InMemoryDB());
    }, DB_INIT_TIMEOUT_MS);
  });
  try {
    const db = await Promise.race([openDb({ opfs: true }), timeout]);
    return db;
  } catch (e) {
    console.warn('[db] init fallita — fallback in memoria (non persistente).', e);
    return new InMemoryDB();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Restituisce (creando alla prima chiamata) il singleton del client DB.
 * `opfs = true` forza il path browser/production wa-sqlite.
 */
export function getDbClient(): Promise<DbClient> {
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    const db = await openDbWithFallback();
    await runMigrations(db);
    return {
      db,
      dreamRepo: new DreamRepo(db),
      signRepo: new SignRepo(db),
      nightRepo: new NightRepo(db),
      settingsRepo: new SettingsRepo(db),
      rcRepo: new RCRepo(db),
    };
  })();
  return cachedPromise;
}

/** Solo test: resetta la cache del singleton. */
export function _resetDbClientCache(): void {
  cachedPromise = null;
}
