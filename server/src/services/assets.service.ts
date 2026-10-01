import { getPublicAssets } from "#lib/assets.ts"
import { RoutePrefix } from "#lib/routes/prefixes.ts"

const INDEX_LANDING = "index.html"
const INDEX_APP = `app/index.html`

/**
 * I file prodotti dai due build (landing + app), come risposte pronte.
 * Stessa struttura del FrontendAssetsController del bun-full-stack-starter,
 * con due alberi: la landing a radice e la PWA sotto /app.
 */
export class AssetsService {
	private readonly files: Map<string, Blob>

	constructor() {
		this.files = getPublicAssets()
	}

	/** Una rotta GET per ogni file: handler che restituisce una Response pronta. */
	routes(): Map<string, () => Response> {
		const routes = new Map<string, () => Response>()
		for (const [path, blob] of this.files) {
			const routePath = `/${path}`
			routes.set(
				routePath,
				() => new Response(blob, { headers: this.headersFor(path) }),
			)
		}
		// La landing su / (senza trailing filename).
		if (this.files.has(INDEX_LANDING)) {
			routes.set("/", () => this.fallbackResponse("/"))
		}
		// La PWA su /app (senza trailing index.html).
		if (this.files.has(INDEX_APP)) {
			routes.set(RoutePrefix.App, () => this.fallbackResponse(RoutePrefix.App))
		}
		return routes
	}

	/**
	 * SPA fallback: path non-API che non matcha un file → index della SPA giusta
	 * (landing per /, app per /app/*).
	 */
	fallbackResponse(pathname: string): Response {
		const index = pathname.startsWith(RoutePrefix.App)
			? INDEX_APP
			: INDEX_LANDING
		const blob = this.files.get(index)
		if (!blob) {
			return new Response("frontend not built", { status: 503 })
		}
		return new Response(blob, { headers: this.headersFor(index) })
	}

	private headersFor(path: string): Record<string, string> {
		const headers: Record<string, string> = {}
		if (path.startsWith("app/_app/") || path.startsWith("_app/")) {
			// Asset hashati di SvelteKit/Vite: immutabili.
			headers["cache-control"] = "public, max-age=31536000, immutable"
		} else {
			headers["cache-control"] = "no-cache"
		}
		return headers
	}
}
