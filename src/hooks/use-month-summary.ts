"use client"

import { useMonthEnvelopes } from "@/hooks/use-budget-envelopes"
import { useMonthExpensesPage } from "@/hooks/use-expenses"
import { useMonthIncomes } from "@/hooks/use-incomes"
import { type MonthTotals, totals } from "@/lib/month-rows"
import type { Id } from "@/types/common"

export type MonthSummary =
	| { status: "loading" }
	| { status: "error"; error: unknown; refetch: () => void }
	| { status: "ready"; totals: MonthTotals }

/**
 * Income, expenses and balance for a month. The expense part is `totalAmount`
 * from the first page of `GET /expenses`, so it covers every page. Page 1 with
 * the default sort shares its cache with the table.
 */
export function useMonthSummary(periodId: Id | undefined): MonthSummary {
	const expenses = useMonthExpensesPage(periodId, 1)
	const incomes = useMonthIncomes(periodId)
	const envelopes = useMonthEnvelopes(periodId)

	const failed = [expenses, incomes, envelopes].find((q) => q.isError)
	if (failed) {
		return {
			status: "error",
			error: failed.error,
			refetch: () => {
				for (const q of [expenses, incomes, envelopes]) {
					if (q.isError) q.refetch()
				}
			}
		}
	}
	if (!expenses.data || !incomes.data || !envelopes.data) {
		return { status: "loading" }
	}
	return {
		status: "ready",
		totals: totals({
			expenseTotal: expenses.data.totalAmount,
			envelopes: envelopes.data,
			incomes: incomes.data
		})
	}
}
