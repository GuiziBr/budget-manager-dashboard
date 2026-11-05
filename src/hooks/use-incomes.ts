"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { CreateIncomeInput, Id, Income, UpdateIncomeInput } from "@/types"

/** Every income query starts with this key, so invalidating it refreshes all of them. */
export const INCOMES_QUERY_KEY = ["incomes"] as const

export function monthIncomesQueryKey(periodId: Id | undefined) {
	return [...INCOMES_QUERY_KEY, "month", periodId] as const
}

/** The incomes of one month. Waits until the month's id is known. */
export function useMonthIncomes(periodId: Id | undefined) {
	return useQuery({
		queryKey: monthIncomesQueryKey(periodId),
		queryFn: () => api.get<Income[]>(`incomes?budgetPeriodId=${periodId}`),
		enabled: periodId !== undefined
	})
}

export function useCreateIncome() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: CreateIncomeInput) =>
			api.post<Income>("incomes", input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: INCOMES_QUERY_KEY })
	})
}

export function useUpdateIncome() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, ...input }: UpdateIncomeInput & { id: Id }) =>
			api.patch<Income>(`incomes/${id}`, input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: INCOMES_QUERY_KEY })
	})
}

export function useDeleteIncome() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: Id) => api.delete<void>(`incomes/${id}`),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: INCOMES_QUERY_KEY })
	})
}
