type QueryValue = string | number | null | undefined

/**
 * Params whose every field is a supported value. Unlike a string-indexed
 * record, it accepts interfaces such as `ExpenseListParams`.
 */
export type QueryParams<T> = { [K in keyof T]: QueryValue }

/** Builds `?a=1&b=2`, or an empty string. Skips undefined, null and empty values. */
export function buildQuery<T extends QueryParams<T>>(params: T): string {
	const search = new URLSearchParams()

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") continue
		search.set(key, String(value))
	}

	const query = search.toString()
	return query ? `?${query}` : ""
}
