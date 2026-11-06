import type { MonthComparison } from "@/lib/month"
import type { BudgetPeriod } from "@/types"

export type MonthState =
	| "loading"
	| "error"
	| "not-opened"
	| "not-tracked"
	| "closed"
	| "open"

export interface MonthStateInput {
	isLoading: boolean
	error: unknown
	period: BudgetPeriod | undefined
	comparison: MonthComparison
}

export function getMonthState({
	isLoading,
	error,
	period,
	comparison
}: MonthStateInput): MonthState {
	if (isLoading) return "loading"
	if (error) return "error"
	if (!period) return comparison === "past" ? "not-tracked" : "not-opened"
	return comparison === "past" ? "closed" : "open"
}

/** Actions (add, edit, delete, mark paid) are allowed only in an opened current or future month. */
export function canEditMonth(state: MonthState): boolean {
	return state === "open"
}
