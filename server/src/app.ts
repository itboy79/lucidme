import { Elysia } from "elysia"
import { ApiController } from "#routes/api/controller.ts"
import {
	FrontendAssetsController,
	FrontendFallbackController,
} from "#routes/controller.ts"

export function createApp() {
	// I file frontend prima di tutto (vedi la nota sul controller stesso),
	// poi le API, poi il fallback SPA per ultimo.
	return new Elysia()
		.use(FrontendAssetsController)
		.use(ApiController)
		.use(FrontendFallbackController)
}
