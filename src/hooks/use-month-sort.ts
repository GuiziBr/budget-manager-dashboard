"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo, useSyncExternalStore } from "react"
import {
	nextSort,
	parseSort,
	type SortColumn,
	type SortIndicator,
	type SortState,
	sortIndicator,
	toSortSearch
} from "@/lib/expense-sort"
import {
	readStoredString,
	subscribeToStorage,
	writeStoredString
} from "@/lib/storage"

export const MONTH_SORT_STORAGE_KEY = "month-sort"

const serialize = (state: SortState): string | null => {
	const { sortBy, sortOrder } = toSortSearch(state)
	return sortBy && sortOrder ? `${sortBy}:${sortOrder}` : null
}

const parseStored = (value: string | null): SortState => {
	if (!value) return null
	const [sortBy, sortOrder] = value.split(":")
	return parseSort(sortBy ?? null, sortOrder ?? null)
}

/**
 * The table's sort. The address (`?sortBy=&sortOrder=`) wins, then the sort
 * remembered on this device, then the default order (`null`). Changing it goes
 * back to page 1 in the same navigation and keeps `?period=`. The third click
 * removes the remembered sort instead of storing the default.
 */
export function useMonthSort() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const stored = useSyncExternalStore(
		subscribeToStorage,
		() => readStoredString(MONTH_SORT_STORAGE_KEY),
		() => null
	)

	const sortBy = searchParams.get("sortBy")
	const sortOrder = searchParams.get("sortOrder")
	const sort = useMemo(
		() => parseSort(sortBy, sortOrder) ?? parseStored(stored),
		[sortBy, sortOrder, stored]
	)

	const toggleSort = useCallback(
		(column: SortColumn) => {
			const next = nextSort(sort, column)
			writeStoredString(MONTH_SORT_STORAGE_KEY, serialize(next))
			const params = new URLSearchParams(searchParams.toString())
			params.delete("sortBy")
			params.delete("sortOrder")
			params.delete("page")
			for (const [key, value] of Object.entries(toSortSearch(next)))
				params.set(key, value)
			router.push(`?${params.toString()}`, { scroll: false })
		},
		[sort, searchParams, router]
	)

	const indicatorFor = (column: SortColumn): SortIndicator =>
		sortIndicator(sort, column)

	return { sort, indicatorFor, toggleSort }
}
