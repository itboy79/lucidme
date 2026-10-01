export const RoutePrefix = {
	Api: "/api",
	// La PWA è servita sotto questo prefisso dalla stessa origine (niente CORS,
	// un solo binario). La landing sta a radice.
	App: "/app",
} as const
