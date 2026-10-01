import { Elysia } from "elysia"
import { RoutePrefix } from "#lib/routes/prefixes.ts"
import { AssetsServicePlugin } from "#services/plugins.ts"

// Un file del build = una rotta nativa: un handler che RESTITUISCE una
// Response pronta resta sul path statico di Bun (304 su If-None-Match gratis).
// Montati PRIMA degli hook globali per non compilare la rotta nel pipeline
// dinamico — stessa nota del bun-full-stack-starter.
function createFrontendAssetsController() {
	const controller = new Elysia().use(AssetsServicePlugin)
	const { assetsService } = controller.decorator

	for (const [path, response] of assetsService.routes()) {
		controller.get(path, response, { detail: { hide: true } })
	}

	return controller
}

// Un mount, non una `*` route: una wildcard è greedy nel suo metodo e si
// mangerebbe i GET wildcard dei fratelli. Il mount gira solo se nulla ha
// matchato: per questo sta per ultimo.
function createFrontendFallbackController() {
	const controller = new Elysia().use(AssetsServicePlugin)
	const { assetsService } = controller.decorator

	controller.mount((request) => {
		const { pathname } = new URL(request.url)
		if (pathname.startsWith(RoutePrefix.Api)) {
			return new Response("not found", { status: 404 })
		}
		return assetsService.fallbackResponse(pathname)
	})

	return controller
}

export const FrontendAssetsController = createFrontendAssetsController()
export const FrontendFallbackController = createFrontendFallbackController()
