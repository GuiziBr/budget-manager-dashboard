"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { LOOKUP_STALE_TIME_MS } from "@/lib/constants"
import type { Id, RecurringExpense } from "@/types"

export const RECURRING_EXPENSES_QUERY_KEY = ["recurring-expenses"] as const

export function recurringExpenseQueryKey(id: Id | undefined) {
	return [...RECURRING_EXPENSES_QUERY_KEY, id] as const
}

/**
 * One recurring bill. Read only while the details panel of a recurring row is
 * open, for the month the bill started. Pass `undefined` to skip the request.
 */
export function useRecurringExpense(id: Id | undefined) {
	return useQuery({
		queryKey: recurringExpenseQueryKey(id),
		queryFn: () => api.get<RecurringExpense>(`recurring-expenses/${id}`),
		enabled: id !== undefined,
		staleTime: LOOKUP_STALE_TIME_MS
	})
}
