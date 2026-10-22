"use client"

import type { UseQueryResult } from "@tanstack/react-query"
import { useEffect, useState } from "react"

interface PageParams {
	offset: number
	limit: number
	orderBy?: string
	orderType?: "asc" | "desc"
}

/**
 * Offset-based paging and column sorting for a list query that returns
 * `totalCount`. Changing the sort goes back to the first page.
 *
 * Keeps the offset inside the list: deleting the last row of the last page
 * would otherwise leave the offset past the end, so the refetch comes back
 * empty while `totalCount` is still above zero and the pagination disappears.
 */
export function usePagedList<T extends { totalCount: number }>(
	useList: (params: PageParams) => UseQueryResult<T>,
	limit: number
) {
	const [params, setParams] = useState<PageParams>({ offset: 0, limit })
	const { data, isLoading, error, isPlaceholderData } = useList(params)

	const totalCount = data?.totalCount
	const totalPages =
		totalCount === undefined ? 0 : Math.ceil(totalCount / params.limit)
	const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
	const currentPage = Math.floor(params.offset / params.limit) + 1

	useEffect(() => {
		// Wait for fresh data: placeholder data belongs to the previous page
		if (totalCount === undefined || isPlaceholderData) return

		const lastPage = Math.max(totalPages, 1)
		if (currentPage > lastPage) {
			setParams((prev) => ({ ...prev, offset: (lastPage - 1) * prev.limit }))
		}
	}, [totalCount, totalPages, currentPage, isPlaceholderData])

	const setPage = (page: number) =>
		setParams((prev) => ({ ...prev, offset: (page - 1) * prev.limit }))

	const toggleSort = (column: string) =>
		setParams((prev) => ({
			...prev,
			offset: 0,
			orderBy: column,
			orderType:
				prev.orderBy === column && prev.orderType === "asc" ? "desc" : "asc"
		}))

	const getSortIndicator = (column: string): "↑" | "↓" | "" => {
		if (params.orderBy !== column) return ""
		return params.orderType === "desc" ? "↓" : "↑"
	}

	return {
		data,
		isLoading,
		error,
		params,
		pages,
		totalPages,
		currentPage,
		setPage,
		toggleSort,
		getSortIndicator
	}
}
