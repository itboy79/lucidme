import { runMigrations } from "#db/migrate.ts"
import { env } from "#lib/env.ts"

await runMigrations()

// Import dinamico: prima le migrazioni, poi l'app.
const { createApp } = await import("#app.ts")

const { server } = createApp().listen({
	port: env.PORT,
	hostname: "0.0.0.0",
})

console.info(`[main] listening on ${server!.url.origin}`)
