import { Elysia } from "elysia"
import { RoutePrefix } from "#lib/routes/prefixes.ts"
import { FeedbackController } from "#routes/api/feedback/controller.ts"
import { HealthController } from "#routes/api/health/controller.ts"
import { WaitlistController } from "#routes/api/waitlist/controller.ts"

// Il prefisso /api è applicato qui: i controller figli scrivono path nudi.
export const ApiController = new Elysia({ prefix: RoutePrefix.Api })
	.use(HealthController)
	.use(WaitlistController)
	.use(FeedbackController)
