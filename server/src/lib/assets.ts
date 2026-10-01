import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import type { BunFile } from "bun"

/* Sostituiti al build (vedi scripts/build.ts). */
declare const PUBLIC_DIR_NAME: string
declare const DB_MIGRATIONS_DIR_NAME: string

// Da sorgente gli asset stanno in cartelle del repo; il binario compilato
// porta la propria copia embedded e legge quella.
const PUBLIC_DIR = resolve(process.cwd(), PUBLIC_DIR_NAME)
const DB_MIGRATIONS_DIR = resolve(
	import.meta.dir,
	"..",
	"db",
	DB_MIGRATIONS_DIR_NAME,
)

/** Chiave = path del file relativo alla cartella di provenienza. */
export type AssetFiles = Map<string, Blob>

export function getPublicAssets(): AssetFiles {
	return readAssets({ folderName: PUBLIC_DIR_NAME, folder: PUBLIC_DIR })
}

export function getMigrations(): AssetFiles {
	return readAssets({
		folderName: DB_MIGRATIONS_DIR_NAME,
		folder: DB_MIGRATIONS_DIR,
	})
}

// Dove stanno gli asset lo risponde il runtime (Bun 1.4+), non lo si deduce.
function readAssets({
	folderName,
	folder,
}: {
	folderName: string
	folder: string
}): AssetFiles {
	return Bun.isStandaloneExecutable
		? readEmbeddedFolder(folderName)
		: readFolder(folder)
}

// `--asset <folder>` embedda l'albero sotto il suo basename: il nome del file
// embedded inizia con `<basename>/`, ed è quello il filtro.
function readEmbeddedFolder(folderName: string): AssetFiles {
	const prefix = `${folderName}/`

	const files: AssetFiles = new Map()
	for (const file of Bun.embeddedFiles as readonly BunFile[]) {
		const path = file.name
		if (path?.startsWith(prefix)) {
			files.set(path.slice(prefix.length), file)
		}
	}
	return sortedByPath(files)
}

function readFolder(folder: string): AssetFiles {
	if (!existsSync(folder)) {
		return new Map()
	}

	const files: AssetFiles = new Map()
	for (const entry of new Bun.Glob("**/*").scanSync({
		cwd: folder,
		onlyFiles: true,
	})) {
		const filePath = join(folder, entry)
		// Letti eagerly come gli embedded: una static route deve avere il body in memoria.
		const fileType = Bun.file(filePath).type
		files.set(entry, new Blob([readFileSync(filePath)], { type: fileType }))
	}
	return sortedByPath(files)
}

// Le migrazioni girano in ordine di nome: nessuna delle due sorgenti lo promette.
function sortedByPath(files: AssetFiles): AssetFiles {
	const sorted: AssetFiles = new Map()
	for (const path of [...files.keys()].sort()) {
		sorted.set(path, files.get(path)!)
	}
	return sorted
}
