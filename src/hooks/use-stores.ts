"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { LOOKUP_STALE_TIME_MS } from "@/lib/constants"
import type { Store } from "@/types"

export const STORES_QUERY_KEY = ["stores"] as const

export function useStores() {
	return useQuery({
		queryKey: STORES_QUERY_KEY,
		queryFn: () => api.get<Store[]>("stores"),
		staleTime: LOOKUP_STALE_TIME_MS
	})
}
