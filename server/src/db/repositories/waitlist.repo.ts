import { sql } from "#db/client.ts"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// NOTA bun: il result delle INSERT via tagged template ha `affectedRows: null`;
// `.unsafe(query, params)` invece riporta `count` (1 inserita, 0 da OR IGNORE).
/** Inserisce le email nuove; ritorna quante ne sono entrate davvero. */
export async function insertEmails({
	emails,
}: {
	emails: readonly string[]
}): Promise<number> {
	let inserted = 0
	for (const email of emails) {
		const clean = email.trim().toLowerCase()
		if (!EMAIL_PATTERN.test(clean)) {
			continue // email malformata in una coda legacy: si salta, non si fallisce
		}
		const result = await sql.unsafe(
			"INSERT OR IGNORE INTO waitlist (email, created_at) VALUES ($1, $2)",
			[clean, new Date().toISOString()],
		)
		inserted += result.count ?? 0
	}
	return inserted
}

export async function countWaitlist(): Promise<number> {
	const rows = (await sql.unsafe(
		"SELECT COUNT(*) AS n FROM waitlist",
	)) as Array<{ n: number }>
	return rows[0]?.n ?? 0
}
