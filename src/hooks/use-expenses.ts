"use client"

import {
	keepPreviousData,
	type QueryKey,
	useMutation,
	useQuery,
	useQueryClient
} from "@tanstack/react-query"
import { api } from "@/lib/api"
import { type SortState, toSortParams } from "@/lib/expense-sort"
import type {
	CreateExpenseInput,
	Expense,
	ExpenseListParams,
	ExpensePage,
	Id,
	UpdateExpenseInput
} from "@/types"

/** Every expense query starts with this key, so invalidating it refreshes all of them. */
export const EXPENSES_QUERY_KEY = ["expenses"] as const

export const EXPENSES_PAGE_SIZE = 10

/** Only the month pages hold lists; the details of one expense are kept under their own key. */
const MONTH_PAGES_KEY = [...EXPENSES_QUERY_KEY, "month"] as const

/** How long a loaded expense counts as fresh: the details panel opens from the page without a request. */
const EXPENSE_STALE_TIME_MS = 30 * 1000

export function expenseQueryKey(id: Id | undefined) {
	return [...EXPENSES_QUERY_KEY, "detail", id] as const
}

/**
 * One expense by id, for a link to it (the expense may be on any page of any
 * month). Opening a row seeds this entry, so no request is made in that case.
 * Pass `undefined` to skip the request.
 */
export function useExpense(id: Id | undefined) {
	return useQuery({
		queryKey: expenseQueryKey(id),
		queryFn: () => api.get<Expense>(`expenses/${id}`),
		enabled: id !== undefined,
		staleTime: EXPENSE_STALE_TIME_MS,
		retry: false
	})
}

export function monthExpensesQueryKey(
	periodId: Id | undefined,
	page: number,
	sort: SortState
) {
	const { sortBy, sortOrder } = toSortParams(sort)
	return [
		...EXPENSES_QUERY_KEY,
		"month",
		periodId,
		{ page, sortBy, sortOrder }
	] as const
}

/**
 * One page of a month's expenses, sorted by the server. The previous page stays
 * on screen while the next one loads. `totalAmount` covers the whole month, not
 * just this page, so the summary cards don't depend on the page shown.
 */
export function useMonthExpensesPage(
	periodId: Id | undefined,
	page: number,
	sort: SortState = null
) {
	const { sortBy, sortOrder } = toSortParams(sort)

	return useQuery({
		queryKey: monthExpensesQueryKey(periodId, page, sort),
		queryFn: () =>
			api.getPage<ExpensePage>("expenses", {
				budgetPeriodId: periodId,
				page,
				limit: EXPENSES_PAGE_SIZE,
				sortBy,
				sortOrder
			} satisfies ExpenseListParams),
		enabled: periodId !== undefined,
		placeholderData: keepPreviousData
	})
}

export function useCreateExpense() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: CreateExpenseInput) =>
			api.post<Expense>("expenses", input),
		// Installments and recurring bills can land in other months too
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY })
	})
}

export interface UpdateExpenseVariables {
	id: Id
	input: UpdateExpenseInput
}

/** Fields that can be shown before the server answers; lookups need the nested names. */
const OPTIMISTIC_FIELDS = [
	"description",
	"amount",
	"purchasedAt",
	"dueAt",
	"paidAt"
] as const

function applyOptimistic(expense: Expense, input: UpdateExpenseInput): Expense {
	const patch: Partial<Expense> = {}
	for (const field of OPTIMISTIC_FIELDS) {
		if (input[field] !== undefined) {
			Object.assign(patch, { [field]: input[field] })
		}
	}
	return { ...expense, ...patch }
}

/**
 * With `optimistic`, the cached pages show the change at once (description,
 * amount and dates only). A failed request restores the pages as they were.
 */
export function useUpdateExpense({ optimistic = false } = {}) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, input }: UpdateExpenseVariables) =>
			api.patch<Expense>(`expenses/${id}`, input),
		onMutate: async ({ id, input }) => {
			if (!optimistic) return { snapshots: [] }

			await queryClient.cancelQueries({ queryKey: EXPENSES_QUERY_KEY })
			const snapshots = queryClient.getQueriesData<ExpensePage>({
				queryKey: MONTH_PAGES_KEY
			})
			queryClient.setQueriesData<ExpensePage>(
				{ queryKey: MONTH_PAGES_KEY },
				(page) =>
					page && {
						...page,
						data: page.data.map((expense) =>
							expense.id === id ? applyOptimistic(expense, input) : expense
						)
					}
			)
			return { snapshots }
		},
		onError: (_error, _variables, context) => {
			for (const [key, data] of context?.snapshots ?? []) {
				queryClient.setQueryData(key as QueryKey, data)
			}
		},
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY })
	})
}

export function useDeleteExpense() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: Id) => api.delete<void>(`expenses/${id}`),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY })
	})
}
