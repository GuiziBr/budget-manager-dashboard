"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { BudgetPeriod, CreateBudgetPeriodInput } from "@/types"

export const BUDGET_PERIODS_QUERY_KEY = ["budget-periods"] as const

export function useBudgetPeriods() {
	return useQuery({
		queryKey: BUDGET_PERIODS_QUERY_KEY,
		queryFn: () => api.get<BudgetPeriod[]>("budget-periods")
	})
}

export function useCreateBudgetPeriod() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: CreateBudgetPeriodInput) =>
			api.post<BudgetPeriod>("budget-periods", input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: BUDGET_PERIODS_QUERY_KEY })
	})
}

export function useDeleteBudgetPeriod() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => api.delete<void>(`budget-periods/${id}`),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: BUDGET_PERIODS_QUERY_KEY })
	})
}
