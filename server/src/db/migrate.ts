import type { SQL } from "bun"
import { sql } from "#db/client.ts"
import { getMigrations } from "#lib/assets.ts"

const MIGRATIONS_TABLE = "__migrations"
const MIGRATION_FILE_EXTENSION = ".sql"

async function ensureMigrationsTable(db: SQL): Promise<void> {
	await db.unsafe(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      name       text PRIMARY KEY,
      applied_at text NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

async function appliedMigrations(db: SQL): Promise<Set<string>> {
	const rows = (await db.unsafe(
		`SELECT name FROM ${MIGRATIONS_TABLE}`,
	)) as Array<{
		name: string
	}>
	return new Set(rows.map((row) => row.name))
}

async function applyMigration({
	db,
	name,
	file,
}: {
	db: SQL
	name: string
	file: Blob
}): Promise<void> {
	const ddl = await file.text()

	await db.begin(async (tx) => {
		await tx.unsafe(ddl)
		await tx.unsafe(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`, [
			name,
		])
	})

	console.info(`[db/migrate] applied: ${name}`)
}

// Una volta sola all'avvio, sullo stesso client dell'app: SQLite è un file
// unico, una seconda connessione aggiungerebbe solo contesa di lock.
export async function runMigrations(): Promise<void> {
	await ensureMigrationsTable(sql)
	const applied = await appliedMigrations(sql)

	for (const [name, file] of getMigrations()) {
		if (!name.endsWith(MIGRATION_FILE_EXTENSION) || applied.has(name)) {
			continue
		}

		await applyMigration({ db: sql, name, file })
	}

	console.info("[db/migrate] migrations applied")
}
