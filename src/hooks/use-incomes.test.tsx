// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import {
	INCOMES_QUERY_KEY,
	useCreateIncome,
	useDeleteIncome,
	useMonthIncomes,
	useUpdateIncome
} from "./use-incomes"

afterEach(() => {
	vi.restoreAllMocks()
})

const income = {
	id: "i1",
	budgetPeriodId: "p1",
	description: "Salary",
	amount: 5200,
	isSalary: true,
	receivedAt: "2026-11-05",
	createdAt: "2026-11-01T00:00:00.000Z",
	updatedAt: "2026-11-01T00:00:00.000Z",
	deletedAt: null
}

describe("useMonthIncomes", () => {
	it("loads the incomes of the month", async () => {
		const get = vi.spyOn(api, "get").mockResolvedValue([income])
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useMonthIncomes("p1"), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual([income])
		expect(get).toHaveBeenCalledWith("incomes?budgetPeriodId=p1")
	})

	it("does not request anything until the month is known", () => {
		const get = vi.spyOn(api, "get").mockResolvedValue([])
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useMonthIncomes(undefined), {
			wrapper
		})

		expect(result.current.fetchStatus).toBe("idle")
		expect(get).not.toHaveBeenCalled()
	})

	it("keeps each month in its own cache entry", async () => {
		const get = vi
			.spyOn(api, "get")
			.mockImplementation(async (endpoint) =>
				endpoint.endsWith("p1") ? [income] : []
			)
		const { wrapper } = createQueryWrapper()

		const first = renderHook(() => useMonthIncomes("p1"), { wrapper })
		const second = renderHook(() => useMonthIncomes("p2"), { wrapper })

		await waitFor(() => expect(second.result.current.isSuccess).toBe(true))
		expect(first.result.current.data).toEqual([income])
		expect(second.result.current.data).toEqual([])
		expect(get).toHaveBeenCalledTimes(2)
	})

	it("exposes the error when the request fails", async () => {
		vi.spyOn(api, "get").mockRejectedValue(new Error("boom"))
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useMonthIncomes("p1"), { wrapper })

		await waitFor(() => expect(result.current.isError).toBe(true))
	})
})

describe("useCreateIncome", () => {
	it("posts the income and refreshes every income query", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue(income)
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")
		const input = {
			budgetPeriodId: "p1",
			description: "Salary",
			amount: 5200,
			isSalary: true
		}

		const { result } = renderHook(() => useCreateIncome(), { wrapper })
		await act(() => result.current.mutateAsync(input))

		expect(post).toHaveBeenCalledWith("incomes", input)
		expect(invalidate).toHaveBeenCalledWith({ queryKey: INCOMES_QUERY_KEY })
	})

	it("does not refresh when the request fails", async () => {
		vi.spyOn(api, "post").mockRejectedValue(new Error("404"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useCreateIncome(), { wrapper })
		await act(async () => {
			await result.current
				.mutateAsync({ budgetPeriodId: "p1", description: "x", amount: 1 })
				.catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})

describe("useUpdateIncome", () => {
	it("patches only the changed fields, without the id in the body", async () => {
		const patch = vi.spyOn(api, "patch").mockResolvedValue(income)
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useUpdateIncome(), { wrapper })
		await act(() => result.current.mutateAsync({ id: "i1", amount: 5300 }))

		expect(patch).toHaveBeenCalledWith("incomes/i1", { amount: 5300 })
		expect(invalidate).toHaveBeenCalledWith({ queryKey: INCOMES_QUERY_KEY })
	})

	it("can clear the received date", async () => {
		const patch = vi.spyOn(api, "patch").mockResolvedValue(income)
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useUpdateIncome(), { wrapper })
		await act(() => result.current.mutateAsync({ id: "i1", receivedAt: null }))

		expect(patch).toHaveBeenCalledWith("incomes/i1", { receivedAt: null })
	})

	it("does not refresh when the request fails", async () => {
		vi.spyOn(api, "patch").mockRejectedValue(new Error("422"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useUpdateIncome(), { wrapper })
		await act(async () => {
			await result.current.mutateAsync({ id: "i1", amount: 1 }).catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})

describe("useDeleteIncome", () => {
	it("deletes the income and refreshes every income query", async () => {
		const del = vi.spyOn(api, "delete").mockResolvedValue(undefined)
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useDeleteIncome(), { wrapper })
		await act(() => result.current.mutateAsync("i1"))

		expect(del).toHaveBeenCalledWith("incomes/i1")
		expect(invalidate).toHaveBeenCalledWith({ queryKey: INCOMES_QUERY_KEY })
	})

	it("does not refresh when the request fails", async () => {
		vi.spyOn(api, "delete").mockRejectedValue(new Error("422"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useDeleteIncome(), { wrapper })
		await act(async () => {
			await result.current.mutateAsync("i1").catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})
