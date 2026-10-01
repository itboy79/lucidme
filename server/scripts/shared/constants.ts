import { join } from "node:path"

const SERVER_DIR = join(import.meta.dir, "..", "..")
export const DIST_DIR = join(SERVER_DIR, "dist")
export const BINARY_FILE = join(DIST_DIR, "app")
export const ENTRYPOINT = "src/main.ts"

/**
 * Le migrazioni SQL, embedded nel binario (convenzione bun-full-stack-starter).
 */
export const DB_MIGRATIONS_DIR_NAME = "migrations"
export const DB_MIGRATIONS_DIR_NAME_CONSTANT_NAME = "DB_MIGRATIONS_DIR_NAME"
export const DB_MIGRATIONS_DIR = join(
	SERVER_DIR,
	"src/db",
	DB_MIGRATIONS_DIR_NAME,
)

/**
 * I due frontend compilati, copiati qui prima del compile e embedded:
 *   apps/site/dist  → public/        (landing, servita su /)
 *   apps/app/build  → public/app/    (PWA, servita su /app)
 */
export const PUBLIC_DIR_NAME = "public"
export const PUBLIC_DIR_NAME_CONSTANT_NAME = "PUBLIC_DIR_NAME"
export const PUBLIC_DIR = join(SERVER_DIR, PUBLIC_DIR_NAME)
export const SITE_DIST_SRC = join(SERVER_DIR, "..", "apps", "site", "dist")
export const APP_BUILD_SRC = join(SERVER_DIR, "..", "apps", "app", "build")
export const APP_PUBLIC_ROOT = "app"
export const APP_BASE_PATH = `/${APP_PUBLIC_ROOT}`

/**
 * nibrun serve linux x64 (glibc): il build di default targetta quello ovunque
 * venga lanciato. BUILD_TARGET=host compila per la macchina corrente (test locali).
 */
const DEFAULT_BUILD_TARGET = "bun-linux-x64"
const buildTarget = process.env.BUILD_TARGET || DEFAULT_BUILD_TARGET
export const BACKEND_BUILD_TARGET =
	buildTarget === "host" ? undefined : (buildTarget as Bun.Build.CompileTarget)
