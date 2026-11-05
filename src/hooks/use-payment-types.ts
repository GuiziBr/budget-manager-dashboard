"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { LOOKUP_STALE_TIME_MS } from "@/lib/constants"
import type { PaymentType } from "@/types"

export const PAYMENT_TYPES_QUERY_KEY = ["payment-types"] as const

export function usePaymentTypes() {
	return useQuery({
		queryKey: PAYMENT_TYPES_QUERY_KEY,
		queryFn: () => api.get<PaymentType[]>("payment-types"),
		staleTime: LOOKUP_STALE_TIME_MS
	})
}
