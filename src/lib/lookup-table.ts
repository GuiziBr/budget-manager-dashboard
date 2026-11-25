import type { LookupItem } from "./lookup-form"

/** Rows per page in the Management tables. */
export const LOOKUP_PAGE_SIZE = 8

export type LookupColumn = "name" | "flag" | "createdAt"
export type SortDirection = "asc" | "desc"

export interface LookupSort {
	column: LookupColumn
	direction: SortDirection
}

export const DEFAULT_LOOKUP_SORT: LookupSort = {
	column: "name",
	direction: "asc"
}

/** Whether the item has its flag on (uses envelopes, requires a bank). Banks and stores have none. */
export function lookupFlag(item: LookupItem): boolean {
	if ("hasBudgetEnvelope" in item) return item.hasBudgetEnvelope
	if ("hasStatement" in item) return item.hasStatement
	return false
}

/** An `updatedAt` worth showing: the same as `createdAt` means it was never changed. */
export function changedAt(item: LookupItem): string | null {
	return item.updatedAt && item.updatedAt !== item.createdAt
		? item.updatedAt
		: null
}

const byName = (a: LookupItem, b: LookupItem) =>
	a.name.localeCompare(b.name, undefined, { sensitivity: "base" })

/** A new list sorted by the column; ties fall back to the name, ignoring case. */
export function sortLookupRows(
	items: readonly LookupItem[],
	{ column, direction }: LookupSort
): LookupItem[] {
	const sign = direction === "asc" ? 1 : -1
	const compare = (a: LookupItem, b: LookupItem) => {
		if (column === "name") return byName(a, b) * sign
		if (column === "flag") {
			return (
				(Number(lookupFlag(a)) - Number(lookupFlag(b))) * sign || byName(a, b)
			)
		}
		return a.createdAt.localeCompare(b.createdAt) * sign || byName(a, b)
	}
	return [...items].sort(compare)
}

/** Clicking a column sorts it ascending; clicking the sorted column again flips it. */
export function nextLookupSort(
	current: LookupSort,
	column: LookupColumn
): LookupSort {
	return {
		column,
		direction:
			current.column === column && current.direction === "asc" ? "desc" : "asc"
	}
}

export interface LookupPage<T> {
	rows: T[]
	/** The page shown, kept inside the list (a delete may leave the last page empty). */
	page: number
	pages: number[]
	/** 1-based position of the first and last row shown; 0 when empty. */
	from: number
	to: number
	total: number
}

export function pageOf<T>(
	items: readonly T[],
	page: number,
	size = LOOKUP_PAGE_SIZE
): LookupPage<T> {
	const totalPages = Math.max(1, Math.ceil(items.length / size))
	const current = Math.min(Math.max(1, page), totalPages)
	const start = (current - 1) * size
	const rows = items.slice(start, start + size)
	return {
		rows,
		page: current,
		pages: Array.from({ length: totalPages }, (_, i) => i + 1),
		from: rows.length ? start + 1 : 0,
		to: start + rows.length,
		total: items.length
	}
}
