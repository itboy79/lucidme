import { t } from "elysia"

export const GetHealthResponseSchema = t.Object({
	status: t.String(),
	db: t.String(),
	uptimeSec: t.Integer(),
})
