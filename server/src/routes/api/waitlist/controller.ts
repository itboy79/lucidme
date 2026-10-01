import { Elysia, StatusMap } from "elysia"
import {
	PostWaitlistBodySchema,
	PostWaitlistResponseSchema,
} from "#routes/api/waitlist/model.ts"
import { WaitlistServicePlugin } from "#services/plugins.ts"

export const WaitlistController = new Elysia().use(WaitlistServicePlugin).post(
	"/waitlist",
	async ({ body, waitlistService, status }) => {
		const { inserted } = await waitlistService.subscribe({ emails: body })
		return status(StatusMap.OK, { ok: true, inserted })
	},
	// Il body invalido è rifiutato da Elysia con 422 prima dell'handler.
	{
		body: PostWaitlistBodySchema,
		response: { 200: PostWaitlistResponseSchema },
	},
)
