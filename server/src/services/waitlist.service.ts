import { countWaitlist, insertEmails } from "#db/repositories/waitlist.repo.ts"

export class WaitlistService {
	/** Accetta la coda di email del client (array di stringhe, contratto del sito). */
	async subscribe({
		emails,
	}: {
		emails: readonly string[]
	}): Promise<{ inserted: number }> {
		const inserted = await insertEmails({ emails })
		return { inserted }
	}

	async size(): Promise<number> {
		return await countWaitlist()
	}
}
