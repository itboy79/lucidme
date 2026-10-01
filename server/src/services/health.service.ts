import { sql } from "#db/client.ts"

const STARTED_AT = Date.now()
const MS_PER_SECOND = 1000

export class HealthService {
	async check(): Promise<{ status: string; db: string; uptimeSec: number }> {
		try {
			await sql`SELECT 1`
		} catch {
			return {
				status: "degraded",
				db: "down",
				uptimeSec: HealthService.uptime(),
			}
		}
		return { status: "ok", db: "up", uptimeSec: HealthService.uptime() }
	}

	private static uptime(): number {
		return Math.round((Date.now() - STARTED_AT) / MS_PER_SECOND)
	}
}
