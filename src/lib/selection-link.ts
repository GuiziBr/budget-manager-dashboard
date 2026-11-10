import { formatMonth, type Month } from "@/lib/month"
import type { Id } from "@/types"

export type SelectionKind = "expense" | "envelope"

export interface Selection {
	kind: SelectionKind
	id: Id
}

// The query params that name what the details panel shows
const EXPENSE_PARAM = "expense"
const ENVELOPE_PARAM = "envelope"

/** What the address points at: `?expense=` wins over `?envelope=`; blank values count as nothing. */
export function parseSelection(params: URLSearchParams): Selection | null {
	const expense = params.get(EXPENSE_PARAM)?.trim()
	if (expense) return { kind: "expense", id: expense }
	const envelope = params.get(ENVELOPE_PARAM)?.trim()
	if (envelope) return { kind: "envelope", id: envelope }
	return null
}

const toHref = (params: URLSearchParams) => `?${params.toString()}`

/**
 * The same address pointing at `next` (or at nothing), keeping `?period=`, the
 * sort and, unless `page` says otherwise, `?page=`. Page 1 leaves the address clean.
 */
export function selectionHref(
	current: URLSearchParams,
	next: Selection | null,
	options: { page?: number } = {}
): string {
	const params = new URLSearchParams(current.toString())
	if (options.page !== undefined) {
		if (options.page <= 1) params.delete("page")
		else params.set("page", String(options.page))
	}
	params.delete(EXPENSE_PARAM)
	params.delete(ENVELOPE_PARAM)
	if (next) {
		params.set(
			next.kind === "expense" ? EXPENSE_PARAM : ENVELOPE_PARAM,
			next.id
		)
	}
	return toHref(params)
}

/**
 * The same address in another month, keeping the selection and the sort. The
 * page goes back to the first, since the row may be anywhere in the new month.
 */
export function monthChangeHref(
	current: URLSearchParams,
	month: Month
): string {
	const params = new URLSearchParams(current.toString())
	params.set("period", formatMonth(month))
	params.delete("page")
	return toHref(params)
}
