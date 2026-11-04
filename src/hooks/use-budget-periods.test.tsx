// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import {
	BUDGET_PERIODS_QUERY_KEY,
	useBudgetPeriods,
	useCreateBudgetPeriod,
	useDeleteBudgetPeriod
} from "./use-budget-periods"

afterEach(() => {
	vi.restoreAllMocks()
})

const period = {
	id: "p1",
	year: 2026,
	month: 11,
	createdAt: "2026-11-01T00:00:00.000Z",
	updatedAt: "2026-11-01T00:00:00.000Z",
	deletedAt: null
}

describe("useBudgetPeriods", () => {
	it("loads the list from /budget-periods", async () => {
		const get = vi.spyOn(api, "get").mockResolvedValue([period])
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useBudgetPeriods(), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual([period])
		expect(get).toHaveBeenCalledWith("budget-periods")
	})

	it("exposes the error when the request fails", async () => {
		vi.spyOn(api, "get").mockRejectedValue(new Error("boom"))
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useBudgetPeriods(), { wrapper })

		await waitFor(() => expect(result.current.isError).toBe(true))
	})
})

describe("useCreateBudgetPeriod", () => {
	it("posts the month and refreshes the list", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue(period)
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useCreateBudgetPeriod(), { wrapper })
		await act(() => result.current.mutateAsync({ year: 2026, month: 11 }))

		expect(post).toHaveBeenCalledWith("budget-periods", {
			year: 2026,
			month: 11
		})
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: BUDGET_PERIODS_QUERY_KEY
		})
	})

	it("does not refresh the list when the request fails", async () => {
		vi.spyOn(api, "post").mockRejectedValue(new Error("409"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useCreateBudgetPeriod(), { wrapper })
		await act(async () => {
			await result.current
				.mutateAsync({ year: 2026, month: 11 })
				.catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})

describe("useDeleteBudgetPeriod", () => {
	it("deletes the period and refreshes the list", async () => {
		const del = vi.spyOn(api, "delete").mockResolvedValue(undefined)
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useDeleteBudgetPeriod(), { wrapper })
		await act(() => result.current.mutateAsync("p1"))

		expect(del).toHaveBeenCalledWith("budget-periods/p1")
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: BUDGET_PERIODS_QUERY_KEY
		})
	})
})
