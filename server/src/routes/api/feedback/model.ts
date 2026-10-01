import { t } from "elysia"

// Contratto del client (apps/app/src/lib/feedback): POST con l'ARRAY delle
// voci in coda {text, sentAt}. Il testo è ciò che l'utente scrive a proposito
// dell'app: mai contenuto di sogni (che il client non invia).
const MAX_BATCH = 20
const MAX_TEXT_CHARS = 2000

export const PostFeedbackBodySchema = t.Array(
	t.Object({
		text: t.String({ maxLength: MAX_TEXT_CHARS }),
		sentAt: t.String(),
	}),
	{ maxItems: MAX_BATCH },
)

export const PostFeedbackResponseSchema = t.Object({
	ok: t.Literal(true),
	inserted: t.Integer(),
})
