export const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"

/** Lookup lists (categories, payment types, banks, stores) rarely change, so keep them fresh for 10 minutes. */
export const LOOKUP_STALE_TIME_MS = 10 * 60 * 1000
