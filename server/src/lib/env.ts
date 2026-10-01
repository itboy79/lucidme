interface CustomProcessEnv {
	// Entries qui allineate a .env.example
	readonly PORT?: string
	readonly DATA_FOLDER?: string
}

const DEFAULT_PORT = 3000
const DEFAULT_DATA_FOLDER = "./data"

function numberFromEnv({
	name,
	fallback,
}: {
	name: string
	fallback: number
}): number {
	const raw = process.env[name]
	const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
	return Number.isNaN(parsed) ? fallback : parsed
}

export const env = {
	PORT: numberFromEnv({ name: "PORT", fallback: DEFAULT_PORT }),
	DATA_FOLDER: process.env.DATA_FOLDER ?? DEFAULT_DATA_FOLDER,
} as const
