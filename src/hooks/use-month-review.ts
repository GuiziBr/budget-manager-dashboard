"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { BillChange } from "@/lib/month-review"
import {
	pendingSalaries,
	type SalaryInput,
	type SalaryPayload
} from "@/lib/review-salary"
import type { Expense, ExpensePage, Id, Income } from "@/types"
import { EXPENSES_QUERY_KEY, useUpdateExpense } from "./use-expenses"
import { useCreateIncome, useUpdateIncome } from "./use-incomes"

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
	 * salaries already there are matched to their rows instead of being created again.
	 */
	recheck: boolean
	/** What each row was sent as in earlier attempts (a row can be edited after a failure). */
	sent: Readonly<Record<string, readonly SalaryPayload[]>>
	/** Incomes created for rows already confirmed: they never match another row. */
	reserved: ReadonlySet<Id>
}

export interface SavedSalary {
	salary: SalaryInput
	/** The income that stands for the row, when the API returned it. */
	incomeId: Id | undefined
}

export interface SaveSalariesResult {
	saved: SavedSalary[]
	failed: SalaryInput[]
	/** For each failed row, the payload this attempt tried to save. */
	sent: Record<string, SalaryPayload>
}

/**
 * Saves the salaries, one request per row, all at once, as the review's Done asks: a
 * `POST /incomes` for a new row. A failure doesn't stop the others. On a retry the month's
 * incomes are read first: a row whose income already exists (a lost response) isn't created
 * again, and if the row was edited since, that income is updated (`PATCH`) instead. If the
 * re-read fails nothing is sent and every row counts as failed.
 */
export function useSaveReviewSalaries() {
	const { mutateAsync: create } = useCreateIncome()
	const { mutateAsync: update } = useUpdateIncome()
	return useMutation({
		mutationFn: async ({
			periodId,
			wanted,
			recheck,
			sent,
			reserved
		}: SaveSalariesRequest): Promise<SaveSalariesResult> => {
			let tasks: { salary: SalaryInput; income?: Income }[] = wanted.map(
				(salary) => ({ salary })
			)
			if (recheck) {
				try {
					const existing = (
						await api.get<Income[]>(`incomes?budgetPeriodId=${periodId}`)
					).filter((income) => !reserved.has(income.id))
					const split = pendingSalaries(wanted, existing, sent)
					tasks = [
						...split.pending.map((salary) => ({ salary })),
						...split.found
					]
				} catch {
					return { saved: [], failed: [...wanted], sent: {} }
				}
			}
			const outcomes = await Promise.allSettled(
				tasks.map(async ({ salary, income }) => {
					const payload = {
						description: salary.description,
						amount: salary.amount
					}
					if (!income) {
						return create({
							budgetPeriodId: periodId,
							...payload,
							isSalary: true
						})
					}
					const unchanged =
						income.description === payload.description &&
						income.amount === payload.amount
					return unchanged ? income : update({ id: income.id, ...payload })
				})
			)
			const result: SaveSalariesResult = { saved: [], failed: [], sent: {} }
			outcomes.forEach((outcome, index) => {
				const task = tasks[index]
				if (!task) return
				if (outcome.status === "fulfilled") {
					result.saved.push({
						salary: task.salary,
						incomeId: outcome.value?.id ?? task.income?.id
					})
				} else {
					result.failed.push(task.salary)
					result.sent[task.salary.key] = {
						description: task.salary.description,
						amount: task.salary.amount
					}
				}
			})
			return result
		}
	})
}
