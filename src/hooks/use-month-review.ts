"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { BillChange } from "@/lib/month-review"
import { pendingSalaries, type SalaryInput } from "@/lib/review-salary"
import type { Expense, ExpensePage, Id, Income } from "@/types"
import { EXPENSES_QUERY_KEY, useUpdateExpense } from "./use-expenses"
import { useCreateIncome } from "./use-incomes"

/** The most the API returns per page. */
export const REVIEW_PAGE_SIZE = 100

export function reviewExpensesQueryKey(periodId: Id | undefined) {
	return [...EXPENSES_QUERY_KEY, "review", periodId] as const
}

/**
 * Every expense of a month, not one page: the review needs all the generated bills
 * and installment payments. Pages are read until the month's total is reached.
 */
export function useReviewExpenses(periodId: Id | undefined) {
	return useQuery({
		queryKey: reviewExpensesQueryKey(periodId),
		queryFn: async () => {
			const all: Expense[] = []
			for (let page = 1; ; page++) {
				const response = await api.getPage<ExpensePage>("expenses", {
					budgetPeriodId: periodId,
					page,
					limit: REVIEW_PAGE_SIZE
				})
				all.push(...response.data)
				if (response.data.length === 0 || all.length >= response.total) break
			}
			return all
		},
		enabled: periodId !== undefined
	})
}

export interface SaveBillsResult {
	saved: BillChange[]
	failed: BillChange[]
}

/**
 * Saves the edited bill amounts, one `PATCH /expenses/:id` per row, all at once. A row
 * that fails doesn't stop the others; the caller keeps the saved ones and retries only
 * the failed ones. The PATCH changes that month's row only, never the recurring template.
 */
export function useSaveReviewBills() {
	const { mutateAsync } = useUpdateExpense()
	return useMutation({
		mutationFn: async (changes: readonly BillChange[]) => {
			const outcomes = await Promise.allSettled(
				changes.map((change) =>
					mutateAsync({ id: change.id, input: { amount: change.amount } })
				)
			)
			const result: SaveBillsResult = { saved: [], failed: [] }
			outcomes.forEach((outcome, index) => {
				const change = changes[index]
				if (change) {
					result[outcome.status === "fulfilled" ? "saved" : "failed"].push(
						change
					)
				}
			})
			return result
		}
	})
}

export interface SaveSalariesRequest {
	periodId: Id
	wanted: readonly SalaryInput[]
	/**
	 * True on any attempt after the first: the month's incomes are read again and the
	 * salaries already there are skipped, so a request whose response was lost isn't repeated.
	 */
	recheck: boolean
}

export interface SaveSalariesResult {
	saved: SalaryInput[]
	failed: SalaryInput[]
}

/**
 * Creates the salaries, one `POST /incomes` per salary, all at once, as the review's Done
 * asks. A failure doesn't stop the others. If the re-read before a retry fails, nothing is
 * sent and every salary counts as failed, since sending blind could duplicate one.
 */
export function useSaveReviewSalaries() {
	const { mutateAsync } = useCreateIncome()
	return useMutation({
		mutationFn: async ({
			periodId,
			wanted,
			recheck
		}: SaveSalariesRequest): Promise<SaveSalariesResult> => {
			let pending = [...wanted]
			const result: SaveSalariesResult = { saved: [], failed: [] }
			if (recheck) {
				try {
					const existing = await api.get<Income[]>(
						`incomes?budgetPeriodId=${periodId}`
					)
					const split = pendingSalaries(wanted, existing)
					pending = split.pending
					result.saved.push(...split.found)
				} catch {
					return { saved: [], failed: [...wanted] }
				}
			}
			const outcomes = await Promise.allSettled(
				pending.map((salary) =>
					mutateAsync({
						budgetPeriodId: periodId,
						description: salary.description,
						amount: salary.amount,
						isSalary: true
					})
				)
			)
			outcomes.forEach((outcome, index) => {
				const salary = pending[index]
				if (salary) {
					result[outcome.status === "fulfilled" ? "saved" : "failed"].push(
						salary
					)
				}
			})
			return result
		}
	})
}
