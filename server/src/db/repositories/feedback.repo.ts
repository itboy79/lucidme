import { sql } from "#db/client.ts"

export interface FeedbackEntry {
	readonly text: string
	readonly sentAt: string
}

// Stessa NOTA bun del waitlist.repo: count via `.unsafe(query, params)`.
export async function insertFeedback({
	entries,
}: {
	entries: readonly FeedbackEntry[]
}): Promise<number> {
	let inserted = 0
	for (const entry of entries) {
		const result = await sql.unsafe(
			"INSERT INTO feedback (text, created_at) VALUES ($1, $2)",
			[entry.text, entry.sentAt ?? new Date().toISOString()],
		)
		inserted += result.count ?? 0
	}
	return inserted
}
