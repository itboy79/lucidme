import type { FeedbackEntry } from "#db/repositories/feedback.repo.ts"
import { insertFeedback } from "#db/repositories/feedback.repo.ts"

export class FeedbackService {
	/** Accetta la coda del client (array {text, sentAt}, contratto dell'app). */
	async submit({
		entries,
	}: {
		entries: readonly FeedbackEntry[]
	}): Promise<{ inserted: number }> {
		const inserted = await insertFeedback({ entries })
		return { inserted }
	}
}
