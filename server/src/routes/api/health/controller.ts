import { Elysia, StatusMap } from "elysia"
import { GetHealthResponseSchema } from "#routes/api/health/model.ts"
import { HealthServicePlugin } from "#services/plugins.ts"

export const HealthController = new Elysia().use(HealthServicePlugin).get(
	"/health",
	async ({ healthService, status }) => {
		const result = await healthService.check()
		return status(StatusMap.OK, result)
	},
	{
		response: { 200: GetHealthResponseSchema },
	},
)
