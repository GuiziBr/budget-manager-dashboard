"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { BudgetEnvelope, CreateEnvelopeInput, Id } from "@/types"

/** Every envelope query starts with this key, so invalidating it refreshes all of them. */
export const BUDGET_ENVELOPES_QUERY_KEY = ["budget-envelopes"] as const

export function monthEnvelopesQueryKey(periodId: Id | undefined) {
	return [...BUDGET_ENVELOPES_QUERY_KEY, "month", periodId] as const
}

/**
 * The envelopes of one month, each with `spentAmount` (`null` when the spend
 * service is down). The backend caches spend for 60 s in current and future
 * months, so a refetch on window focus is cheap and keeps the figure fresh.
 */
export function useMonthEnvelopes(periodId: Id | undefined) {
	return useQuery({
		queryKey: monthEnvelopesQueryKey(periodId),
		queryFn: () =>
			api.get<BudgetEnvelope[]>(`budget-envelopes?budgetPeriodId=${periodId}`),
		enabled: periodId !== undefined,
		refetchOnWindowFocus: true
	})
}

export function useCreateEnvelope() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: CreateEnvelopeInput) =>
			api.post<BudgetEnvelope>("budget-envelopes", input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: BUDGET_ENVELOPES_QUERY_KEY })
	})
}

/** There is no update hook: budgets are read-only in the app (M-22). */
export function useDeleteEnvelope() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: Id) => api.delete<void>(`budget-envelopes/${id}`),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: BUDGET_ENVELOPES_QUERY_KEY })
	})
}
