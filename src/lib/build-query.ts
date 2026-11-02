export type QueryParams = Record<string, string | number | null | undefined>

/** Builds `?a=1&b=2`, or an empty string. Skips undefined, null and empty values. */
export function buildQuery(params: QueryParams): string {
	const search = new URLSearchParams()

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") continue
		search.set(key, String(value))
	}

	const query = search.toString()
	return query ? `?${query}` : ""
}
