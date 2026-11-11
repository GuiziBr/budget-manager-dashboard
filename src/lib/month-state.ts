import type { MonthComparison } from "@/lib/month"
import type { BudgetPeriod } from "@/types"

export type MonthState =
	| "loading"
	| "error"
	| "not-opened"
	| "not-tracked"
	| "past"
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
	return comparison === "past" ? "past" : "open"
}

/** Expenses and incomes can be changed in every opened month, past ones included. */
export function canEditMonth(state: MonthState): boolean {
	return state === "open" || state === "past"
}

/** Envelopes can't be created or deleted in a past month (the API answers 422). */
export function canEditEnvelopes(state: MonthState): boolean {
	return state === "open"
}
