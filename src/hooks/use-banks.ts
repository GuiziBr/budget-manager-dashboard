"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { LOOKUP_STALE_TIME_MS } from "@/lib/constants"
import type { Bank } from "@/types"

export const BANKS_QUERY_KEY = ["banks"] as const

export function useBanks() {
	return useQuery({
		queryKey: BANKS_QUERY_KEY,
		queryFn: () => api.get<Bank[]>("banks"),
		staleTime: LOOKUP_STALE_TIME_MS
	})
}
