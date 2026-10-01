import { t } from "elysia"

// Contratto del client (apps/site/src/waitlist.ts): POST con l'ARRAY delle
// email in coda (anche più di una, dal flush locale). Solo stringhe.
const MAX_BATCH = 50

export const PostWaitlistBodySchema = t.Array(t.String(), {
	maxItems: MAX_BATCH,
})

export const PostWaitlistResponseSchema = t.Object({
	ok: t.Literal(true),
	inserted: t.Integer(),
})

// GET: SOLO il conteggio (mai le email) — il PM vede la crescita da browser.
export const GetWaitlistCountResponseSchema = t.Object({
	count: t.Integer(),
})
