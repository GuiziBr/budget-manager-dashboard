"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { LOOKUP_STALE_TIME_MS } from "@/lib/constants"
import type {
	Category,
	CreateCategoryInput,
	Id,
	UpdateCategoryInput
} from "@/types"
import { EXPENSES_QUERY_KEY } from "./use-expenses"

export const CATEGORIES_QUERY_KEY = ["categories"] as const

export function useCategories() {
	return useQuery({
		queryKey: CATEGORIES_QUERY_KEY,
		queryFn: () => api.get<Category[]>("categories"),
		staleTime: LOOKUP_STALE_TIME_MS
	})
}

export function useCreateCategory() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: CreateCategoryInput) =>
			api.post<Category>("categories", input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY })
	})
}

/** A rename also refreshes the expenses, whose rows carry the names they display. */
export function useUpdateCategory() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, ...input }: UpdateCategoryInput & { id: Id }) =>
			api.patch<Category>(`categories/${id}`, input),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }),
				queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY })
			])
	})
}

export function useDeleteCategory() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: Id) => api.delete<void>(`categories/${id}`),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY })
	})
}
