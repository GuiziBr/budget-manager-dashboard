"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { LOOKUP_STALE_TIME_MS } from "@/lib/constants"
import type {
	CreatePaymentTypeInput,
	Id,
	PaymentType,
	UpdatePaymentTypeInput
} from "@/types"
import { EXPENSES_QUERY_KEY } from "./use-expenses"

export const PAYMENT_TYPES_QUERY_KEY = ["payment-types"] as const

export function usePaymentTypes() {
	return useQuery({
		queryKey: PAYMENT_TYPES_QUERY_KEY,
		queryFn: () => api.get<PaymentType[]>("payment-types"),
		staleTime: LOOKUP_STALE_TIME_MS
	})
}

export function useCreatePaymentType() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: CreatePaymentTypeInput) =>
			api.post<PaymentType>("payment-types", input),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: PAYMENT_TYPES_QUERY_KEY })
	})
}

/** A rename also refreshes the expenses, whose rows carry the names they display. */
export function useUpdatePaymentType() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, ...input }: UpdatePaymentTypeInput & { id: Id }) =>
			api.patch<PaymentType>(`payment-types/${id}`, input),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: PAYMENT_TYPES_QUERY_KEY }),
				queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY })
			])
	})
}

export function useDeletePaymentType() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: Id) => api.delete<void>(`payment-types/${id}`),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: PAYMENT_TYPES_QUERY_KEY })
	})
}
