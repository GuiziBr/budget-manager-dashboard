/** UUID string. */
export type Id = string

/** ISO 8601 string, as sent over the wire (never a `Date`). */
export type IsoDate = string

/** Body-paged list shape returned by `GET /expenses`. */
export interface PagedResponse<T> {
	data: T[]
	total: number
	page: number
	limit: number
}

export type SortOrder = "asc" | "desc"
