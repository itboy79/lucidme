// @lucidme/db — schema SQLite, migrazioni, repository.
// Local-first, append-only + soft delete. vedi §S2-2.
export { DB_VERSION } from './version.js';

// Client
export type { DB, OpenDbOptions } from './client.js';
export { openDb, getDb, InMemoryDB, _resetDbCache } from './client.js';

// Migrations
export { runMigrations, MIGRATIONS, SCHEMA_VERSION, splitStatements } from './migrations/runner.js';
export type { Migration } from './migrations/runner.js';

// Repositories
export { DreamRepo } from './repositories/dream-repo.js';
export type { ListOptions } from './repositories/dream-repo.js';
export { SignRepo } from './repositories/sign-repo.js';
export { PathRepo, PATH_MAX_DAY, LOCAL_USER_ID } from './repositories/path-repo.js';
export type { PathProgress, PathTechnique } from './repositories/path-repo.js';
export { NightRepo, todayKey } from './repositories/night-repo.js';
export type { NightRitual, NightRitualUpdate } from './repositories/night-repo.js';
export { SettingsRepo } from './repositories/settings-repo.js';
export { RCRepo } from './repositories/rc-repo.js';
export type { RealityCheckEvent, Acknowledged } from './repositories/rc-repo.js';

// Backup
export {
  exportJSON,
  exportMarkdown,
  importJSON,
  validateExportPayload,
} from './backup.js';
export type { ExportPayload } from './backup.js';
