"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { LOOKUP_STALE_TIME_MS } from "@/lib/constants"
import type { CreateStoreInput, Id, Store, UpdateStoreInput } from "@/types"
import { EXPENSES_QUERY_KEY } from "./use-expenses"

export const STORES_QUERY_KEY = ["stores"] as const

export function useStores() {
	return useQuery({
		queryKey: STORES_QUERY_KEY,
		queryFn: () => api.get<Store[]>("stores"),
		staleTime: LOOKUP_STALE_TIME_MS
	})
}

export function useCreateStore() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: CreateStoreInput) => api.post<Store>("stores", input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: STORES_QUERY_KEY })
	})
}

/** A rename also refreshes the expenses, whose rows carry the names they display. */
export function useUpdateStore() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, ...input }: UpdateStoreInput & { id: Id }) =>
			api.patch<Store>(`stores/${id}`, input),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: STORES_QUERY_KEY }),
				queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY })
			])
	})
}

export function useDeleteStore() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: Id) => api.delete<void>(`stores/${id}`),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: STORES_QUERY_KEY })
	})
}
