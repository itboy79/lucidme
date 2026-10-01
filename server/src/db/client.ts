import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { SQL } from "bun"
import { env } from "#lib/env.ts"

// Il volume persistente di nibrun è /app/data: con DATA_FOLDER di default
// il database sopravvive a ogni redeploy senza configurazione.
mkdirSync(env.DATA_FOLDER, { recursive: true })
export const DATABASE_FILE_PATH = join(env.DATA_FOLDER, "lucidme.db")

export const sql = new SQL({
	adapter: "sqlite",
	filename: DATABASE_FILE_PATH,
})

export type Database = typeof sql

// L'adapter sqlite tiene una connessione sola: questo PRAGMA copre ogni query.
await sql.unsafe("PRAGMA foreign_keys = ON")
