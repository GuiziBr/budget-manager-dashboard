"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { LOOKUP_STALE_TIME_MS } from "@/lib/constants"
import type { Bank, CreateBankInput, Id, UpdateBankInput } from "@/types"
import { EXPENSES_QUERY_KEY } from "./use-expenses"

export const BANKS_QUERY_KEY = ["banks"] as const

export function useBanks() {
	return useQuery({
		queryKey: BANKS_QUERY_KEY,
		queryFn: () => api.get<Bank[]>("banks"),
		staleTime: LOOKUP_STALE_TIME_MS
	})
}

export function useCreateBank() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: CreateBankInput) => api.post<Bank>("banks", input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: BANKS_QUERY_KEY })
	})
}

/** A rename also refreshes the expenses, whose rows carry the names they display. */
export function useUpdateBank() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, ...input }: UpdateBankInput & { id: Id }) =>
			api.patch<Bank>(`banks/${id}`, input),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: BANKS_QUERY_KEY }),
				queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY })
			])
	})
}

export function useDeleteBank() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: Id) => api.delete<void>(`banks/${id}`),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: BANKS_QUERY_KEY })
	})
}
