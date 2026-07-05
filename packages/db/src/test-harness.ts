/**
 * Helper di test: apre uno stub InMemoryDB e applica le migration.
 * Riutilizzato da tutti i test dei repository.
 */
import { InMemoryDB, type DB } from './client.js';
import { runMigrations } from './migrations/runner.js';

export async function makeTestDb(): Promise<DB> {
  const db = new InMemoryDB();
  await runMigrations(db);
  return db;
}
