type QueryValue = string | number | null | undefined

/**
 * Query params with supported values only. Pass a type alias or an inline
 * object: interfaces have no implicit index signature and don't match.
 */
export type QueryParams = Record<string, QueryValue>

/**
 * Adds params to an endpoint, keeping any query it already has. Skips
 * undefined, null and empty values; a param replaces an existing one of the
 * same name.
 */
export function withQuery(endpoint: string, params: QueryParams): string {
	const separator = endpoint.indexOf("?")
	const path = separator === -1 ? endpoint : endpoint.slice(0, separator)
	const search = new URLSearchParams(
		separator === -1 ? "" : endpoint.slice(separator + 1)
	)

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") continue
		search.set(key, String(value))
	}

	const query = search.toString()
	return query ? `${path}?${query}` : path
}

/** Builds `?a=1&b=2`, or an empty string. */
export function buildQuery(params: QueryParams): string {
	return withQuery("", params)
}
