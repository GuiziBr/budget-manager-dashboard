// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import type { Expense, ExpensePage } from "@/types"
import {
	EXPENSES_QUERY_KEY,
	monthExpensesQueryKey,
	useCreateExpense,
	useDeleteExpense,
	useMonthExpensesPage,
	useUpdateExpense
} from "./use-expenses"

afterEach(() => {
	vi.restoreAllMocks()
})

function makeExpense(id: string, overrides: Partial<Expense> = {}): Expense {
	return {
		id,
		budgetPeriodId: "p1",
		recurringExpenseId: null,
		description: `Expense ${id}`,
		installmentNumber: null,
		purchasedAt: null,
		dueAt: "2026-11-15",
		paidAt: null,
		amount: 100,
		category: { id: "c1", name: "Food" },
		paymentType: { id: "t1", name: "Card" },
		bank: null,
		store: null,
		installment: null,
		monthsRunning: null,
		createdAt: "2026-11-01T00:00:00.000Z",
		updatedAt: "2026-11-01T00:00:00.000Z",
		deletedAt: null,
		...overrides
	}
}

function makePage(data: Expense[], overrides: Partial<ExpensePage> = {}) {
	return {
		data,
		total: data.length,
		totalAmount: 100 * data.length,
		page: 1,
		limit: 10,
		...overrides
	}
}

describe("useMonthExpensesPage", () => {
	it("asks for one page with the default sort", async () => {
		const getPage = vi
			.spyOn(api, "getPage")
			.mockResolvedValue(makePage([makeExpense("e1")]))
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useMonthExpensesPage("p1", 2), {
			wrapper
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(getPage).toHaveBeenCalledWith("expenses", {
			budgetPeriodId: "p1",
			page: 2,
			limit: 10,
			sortBy: "createdAt",
			sortOrder: "desc"
		})
		expect(result.current.data?.totalAmount).toBe(100)
	})

	it("sends the server sort for a clicked column", async () => {
		const getPage = vi.spyOn(api, "getPage").mockResolvedValue(makePage([]))
		const { wrapper } = createQueryWrapper()

		renderHook(
			() => useMonthExpensesPage("p1", 1, { column: "due", order: "asc" }),
			{ wrapper }
		)

		await waitFor(() => expect(getPage).toHaveBeenCalled())
		expect(getPage).toHaveBeenCalledWith(
			"expenses",
			expect.objectContaining({ sortBy: "dueAt", sortOrder: "asc" })
		)
	})

	it("waits for a period before fetching", () => {
		const getPage = vi.spyOn(api, "getPage").mockResolvedValue(makePage([]))
		const { wrapper } = createQueryWrapper()

		renderHook(() => useMonthExpensesPage(undefined, 1), { wrapper })

		expect(getPage).not.toHaveBeenCalled()
	})

	it("keeps the previous page visible while the next one loads", async () => {
		let resolveSecond: (page: ExpensePage) => void = () => {}
		vi.spyOn(api, "getPage")
			.mockResolvedValueOnce(makePage([makeExpense("e1")], { total: 25 }))
			.mockReturnValueOnce(
				new Promise<ExpensePage>((resolve) => {
					resolveSecond = resolve
				})
			)
		const { wrapper } = createQueryWrapper()

		const { result, rerender } = renderHook(
			({ page }) => useMonthExpensesPage("p1", page),
			{ wrapper, initialProps: { page: 1 } }
		)
		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		rerender({ page: 2 })

		expect(result.current.isPlaceholderData).toBe(true)
		expect(result.current.data?.data[0].id).toBe("e1")

		await act(async () => {
			resolveSecond(makePage([makeExpense("e21")], { page: 2, total: 25 }))
		})
		await waitFor(() => expect(result.current.isPlaceholderData).toBe(false))
		expect(result.current.data?.data[0].id).toBe("e21")
	})

	it("exposes the error when the request fails", async () => {
		vi.spyOn(api, "getPage").mockRejectedValue(new Error("boom"))
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useMonthExpensesPage("p1", 1), {
			wrapper
		})

		await waitFor(() => expect(result.current.isError).toBe(true))
	})
})

describe("useCreateExpense", () => {
	it("posts the expense and refreshes every expense query", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue(makeExpense("e1"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")
		const input = {
			type: "one-time" as const,
			budgetPeriodId: "p1",
			categoryId: "c1",
			paymentTypeId: "t1",
			description: "Coffee",
			amount: 4.5
		}

		const { result } = renderHook(() => useCreateExpense(), { wrapper })
		await act(() => result.current.mutateAsync(input))

		expect(post).toHaveBeenCalledWith("expenses", input)
		expect(invalidate).toHaveBeenCalledWith({ queryKey: EXPENSES_QUERY_KEY })
	})
})

describe("useUpdateExpense", () => {
	it("patches the expense and refreshes every expense query", async () => {
		const patch = vi.spyOn(api, "patch").mockResolvedValue(makeExpense("e1"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useUpdateExpense(), { wrapper })
		await act(() =>
			result.current.mutateAsync({ id: "e1", input: { amount: 12 } })
		)

		expect(patch).toHaveBeenCalledWith("expenses/e1", { amount: 12 })
		expect(invalidate).toHaveBeenCalledWith({ queryKey: EXPENSES_QUERY_KEY })
	})

	it("does not touch the cache before the answer by default", async () => {
		let resolve: (e: Expense) => void = () => {}
		vi.spyOn(api, "patch").mockReturnValue(
			new Promise<Expense>((r) => {
				resolve = r
			})
		)
		const { wrapper, queryClient } = createQueryWrapper()
		const key = monthExpensesQueryKey("p1", 1, null)
		queryClient.setQueryData(key, makePage([makeExpense("e1")]))

		const { result } = renderHook(() => useUpdateExpense(), { wrapper })
		act(() => {
			result.current.mutate({ id: "e1", input: { paidAt: "2026-11-04" } })
		})
		await waitFor(() => expect(result.current.isPending).toBe(true))

		expect(
			queryClient.getQueryData<ExpensePage>(key)?.data[0].paidAt
		).toBeNull()
		await act(async () => resolve(makeExpense("e1")))
	})

	it("shows the change at once when optimistic", async () => {
		let resolve: (e: Expense) => void = () => {}
		vi.spyOn(api, "patch").mockReturnValue(
			new Promise<Expense>((r) => {
				resolve = r
			})
		)
		const { wrapper, queryClient } = createQueryWrapper()
		const key = monthExpensesQueryKey("p1", 1, null)
		queryClient.setQueryData(
			key,
			makePage([makeExpense("e1"), makeExpense("e2")])
		)

		const { result } = renderHook(
			() => useUpdateExpense({ optimistic: true }),
			{
				wrapper
			}
		)
		act(() => {
			result.current.mutate({ id: "e1", input: { paidAt: "2026-11-04" } })
		})

		await waitFor(() => {
			const page = queryClient.getQueryData<ExpensePage>(key)
			expect(page?.data[0].paidAt).toBe("2026-11-04")
		})
		expect(
			queryClient.getQueryData<ExpensePage>(key)?.data[1].paidAt
		).toBeNull()
		await act(async () => resolve(makeExpense("e1")))
	})

	it("restores the pages when the request fails", async () => {
		vi.spyOn(api, "patch").mockRejectedValue(new Error("boom"))
		const { wrapper, queryClient } = createQueryWrapper()
		const key = monthExpensesQueryKey("p1", 1, null)
		const original = makePage([makeExpense("e1")])
		queryClient.setQueryData(key, original)
		// Keep the refetch after the failure from replacing the cache
		vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()

		const { result } = renderHook(
			() => useUpdateExpense({ optimistic: true }),
			{
				wrapper
			}
		)
		await act(async () => {
			await result.current
				.mutateAsync({ id: "e1", input: { paidAt: "2026-11-04" } })
				.catch(() => {})
		})

		expect(queryClient.getQueryData(key)).toEqual(original)
	})

	it("clears the paid date optimistically when sent null", async () => {
		let resolve: (e: Expense) => void = () => {}
		vi.spyOn(api, "patch").mockReturnValue(
			new Promise<Expense>((r) => {
				resolve = r
			})
		)
		const { wrapper, queryClient } = createQueryWrapper()
		const key = monthExpensesQueryKey("p1", 1, null)
		queryClient.setQueryData(
			key,
			makePage([makeExpense("e1", { paidAt: "2026-11-02" })])
		)

		const { result } = renderHook(
			() => useUpdateExpense({ optimistic: true }),
			{
				wrapper
			}
		)
		act(() => {
			result.current.mutate({ id: "e1", input: { paidAt: null } })
		})

		await waitFor(() =>
			expect(
				queryClient.getQueryData<ExpensePage>(key)?.data[0].paidAt
			).toBeNull()
		)
		await act(async () => resolve(makeExpense("e1")))
	})
})

describe("useDeleteExpense", () => {
	it("deletes the expense and refreshes every expense query", async () => {
		const del = vi.spyOn(api, "delete").mockResolvedValue(undefined)
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useDeleteExpense(), { wrapper })
		await act(() => result.current.mutateAsync("e1"))

		expect(del).toHaveBeenCalledWith("expenses/e1")
		expect(invalidate).toHaveBeenCalledWith({ queryKey: EXPENSES_QUERY_KEY })
	})
})
