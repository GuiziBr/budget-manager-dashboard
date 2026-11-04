import type { ExpenseListParams, ExpenseSortBy, SortOrder } from "@/types"

/** Sortable table headers. Named after the headers, so the UI never touches an API key. */
export type SortColumn =
	| "item"
	| "category"
	| "payment"
	| "due"
	| "paid"
	| "amount"

/** `null` is the default order. */
export type SortState = { column: SortColumn; order: SortOrder } | null

export type SortIndicator = "↑" | "↓" | ""

type SortParams = Required<Pick<ExpenseListParams, "sortBy" | "sortOrder">>

/** Header to API key. Typed against `ExpenseSortBy`, so a key the API lacks doesn't compile. */
export const SORT_KEYS: Record<SortColumn, ExpenseSortBy> = {
	item: "description",
	category: "categoryName",
	payment: "paymentTypeName",
	due: "dueAt",
	paid: "paidAt",
	amount: "amount"
}

/** Newest first. Sent explicitly so a request never depends on the server's default. */
export const DEFAULT_SORT_PARAMS: SortParams = {
	sortBy: "createdAt",
	sortOrder: "desc"
}

const COLUMNS = Object.keys(SORT_KEYS) as SortColumn[]

/** The `sortBy` / `sortOrder` params for `GET /expenses`. */
export function toSortParams(state: SortState): SortParams {
	if (!state) return DEFAULT_SORT_PARAMS
	return { sortBy: SORT_KEYS[state.column], sortOrder: state.order }
}

/**
 * Header click: ascending, then descending, then back to the default order.
 * Another column starts ascending.
 */
export function nextSort(state: SortState, column: SortColumn): SortState {
	if (state?.column !== column) return { column, order: "asc" }
	if (state.order === "asc") return { column, order: "desc" }
	return null
}

export function sortIndicator(
	state: SortState,
	column: SortColumn
): SortIndicator {
	if (state?.column !== column) return ""
	return state.order === "asc" ? "↑" : "↓"
}

/**
 * Reads a sort from the address or from storage. Anything that isn't one of the
 * sortable headers (including the default key) gives `null`, so a stale or
 * hand-edited value falls back to the default order.
 */
export function parseSort(
	sortBy: string | null | undefined,
	sortOrder: string | null | undefined
): SortState {
	if (sortOrder !== "asc" && sortOrder !== "desc") return null
	const column = COLUMNS.find((c) => SORT_KEYS[c] === sortBy)
	return column ? { column, order: sortOrder } : null
}

/** Address params for a sort; empty at the default order. */
export function toSortSearch(state: SortState): {
	sortBy?: ExpenseSortBy
	sortOrder?: SortOrder
} {
	if (!state) return {}
	return toSortParams(state)
}
