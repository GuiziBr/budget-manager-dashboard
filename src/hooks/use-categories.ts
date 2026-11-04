"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { LOOKUP_STALE_TIME_MS } from "@/lib/constants"
import type { Category } from "@/types"

export const CATEGORIES_QUERY_KEY = ["categories"] as const

export function useCategories() {
	return useQuery({
		queryKey: CATEGORIES_QUERY_KEY,
		queryFn: () => api.get<Category[]>("categories"),
		staleTime: LOOKUP_STALE_TIME_MS
	})
}
