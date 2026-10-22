/**
 * Extracts a user-facing message from an unknown error, falling back to a
 * generic message when the error has none (e.g. a network failure).
 */
export function getErrorMessage(error: unknown, fallback: string): string {
	return error instanceof Error && error.message ? error.message : fallback
}
