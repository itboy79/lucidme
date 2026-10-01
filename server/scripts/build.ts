import { cp, rm } from "node:fs/promises"
import { join } from "node:path"
import {
	APP_BUILD_SRC,
	APP_PUBLIC_ROOT,
	BACKEND_BUILD_TARGET,
	BINARY_FILE,
	DB_MIGRATIONS_DIR,
	DB_MIGRATIONS_DIR_NAME,
	DB_MIGRATIONS_DIR_NAME_CONSTANT_NAME,
	DIST_DIR,
	ENTRYPOINT,
	PUBLIC_DIR,
	PUBLIC_DIR_NAME,
	PUBLIC_DIR_NAME_CONSTANT_NAME,
	SITE_DIST_SRC,
} from "./shared/constants"

console.log("🧹 Cleaning dist dir...")
await rm(DIST_DIR, { recursive: true, force: true })

console.log("🧹 Cleaning public dir...")
await rm(PUBLIC_DIR, { recursive: true, force: true })

console.log("📄 Copying site dist → public/ ...")
await cp(SITE_DIST_SRC, PUBLIC_DIR, { recursive: true })

console.log("📄 Copying app build → public/app/ ...")
await cp(APP_BUILD_SRC, join(PUBLIC_DIR, APP_PUBLIC_ROOT), { recursive: true })

console.log(
	`🔨 Compiling binary for ${BACKEND_BUILD_TARGET ?? "the host platform"}...`,
)
const buildResult = await Bun.build({
	entrypoints: [ENTRYPOINT],
	compile: {
		outfile: BINARY_FILE,
		...(BACKEND_BUILD_TARGET ? { target: BACKEND_BUILD_TARGET } : {}),
		assets: [PUBLIC_DIR, DB_MIGRATIONS_DIR],
	},
	bytecode: true,
	format: "esm",
	naming: { asset: "[dir]/[name].[ext]" },
	define: {
		// Aggiornare anche scripts/dev.ts se cambiano questi
		[PUBLIC_DIR_NAME_CONSTANT_NAME]: JSON.stringify(PUBLIC_DIR_NAME),
		[DB_MIGRATIONS_DIR_NAME_CONSTANT_NAME]: JSON.stringify(
			DB_MIGRATIONS_DIR_NAME,
		),
	},
	minify: { whitespace: true, syntax: true },
	target: "bun",
})

if (!buildResult.success) {
	console.error("❌ Build failed:", JSON.stringify(buildResult, null, 2))
	process.exit(1)
}

console.log("✅ Done")
