import { Elysia, StatusMap } from "elysia"
import {
	PostFeedbackBodySchema,
	PostFeedbackResponseSchema,
} from "#routes/api/feedback/model.ts"
import { FeedbackServicePlugin } from "#services/plugins.ts"

export const FeedbackController = new Elysia().use(FeedbackServicePlugin).post(
	"/feedback",
	async ({ body, feedbackService, status }) => {
		const { inserted } = await feedbackService.submit({ entries: body })
		return status(StatusMap.OK, { ok: true, inserted })
	},
	// Il body invalido è rifiutato da Elysia con 422 prima dell'handler.
	{
		body: PostFeedbackBodySchema,
		response: { 200: PostFeedbackResponseSchema },
	},
)
