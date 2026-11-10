// Every id the API hands out is a UUID (v1-v8, the version nibble isn't checked elsewhere either)
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Whether `value` looks like an id the API could have issued. Used to reject
 * an id taken from the address (`?expense=`, `?envelope=`) before it's put
 * into a request path: an attacker-controlled value such as `..%2Fcategories`
 * could otherwise reach another endpoint.
 */
export function isUuid(value: string): boolean {
	return UUID_PATTERN.test(value)
}
