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
 * Restituisce (creando alla prima chiamata) il singleton del client DB.
 * `opfs = true` forza il path browser/production wa-sqlite.
 */
export function getDbClient(): Promise<DbClient> {
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    const db = await openDb({ opfs: true });
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
