// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { LOOKUP_STALE_TIME_MS } from "@/lib/constants"
import { createQueryWrapper } from "@/test/query-wrapper"
import {
	CATEGORIES_QUERY_KEY,
	useCategories,
	useCreateCategory,
	useDeleteCategory,
	useUpdateCategory
} from "./use-categories"
import { EXPENSES_QUERY_KEY } from "./use-expenses"

afterEach(() => {
	vi.restoreAllMocks()
})

describe("useCategories", () => {
	it("loads the list from /categories", async () => {
		const items = [{ id: "1", name: "A" }]
		const get = vi.spyOn(api, "get").mockResolvedValue(items)
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useCategories(), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(items)
		expect(get).toHaveBeenCalledWith("categories")
	})

	it("caches the list under its key for the lookup stale time", async () => {
		vi.spyOn(api, "get").mockResolvedValue([])
		const { wrapper, queryClient } = createQueryWrapper()

		const { result } = renderHook(() => useCategories(), { wrapper })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		const query = queryClient
			.getQueryCache()
			.find({ queryKey: CATEGORIES_QUERY_KEY })
		expect(query).toBeDefined()
		expect(query?.observers[0]?.options.staleTime).toBe(LOOKUP_STALE_TIME_MS)
	})

	it("exposes the error when the request fails", async () => {
		vi.spyOn(api, "get").mockRejectedValue(new Error("boom"))
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useCategories(), { wrapper })

		await waitFor(() => expect(result.current.isError).toBe(true))
	})
})

describe("useCreateCategory", () => {
	it("posts the item and refreshes the list only", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue({ id: "1" })
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")
		const input = { name: "Rent", hasBudgetEnvelope: true }

		const { result } = renderHook(() => useCreateCategory(), { wrapper })
		await act(() => result.current.mutateAsync(input))

		expect(post).toHaveBeenCalledWith("categories", input)
		expect(invalidate).toHaveBeenCalledTimes(1)
		expect(invalidate).toHaveBeenCalledWith({ queryKey: CATEGORIES_QUERY_KEY })
	})

	it("does not refresh when the request fails", async () => {
		vi.spyOn(api, "post").mockRejectedValue(new Error("409"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useCreateCategory(), { wrapper })
		await act(async () => {
			await result.current
				.mutateAsync({ name: "Rent", hasBudgetEnvelope: true })
				.catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})

describe("useUpdateCategory", () => {
	it("patches only the given fields and refreshes the list and the expenses", async () => {
		const patch = vi.spyOn(api, "patch").mockResolvedValue({ id: "1" })
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useUpdateCategory(), { wrapper })
		await act(() =>
			result.current.mutateAsync({ id: "1", hasBudgetEnvelope: false })
		)

		expect(patch).toHaveBeenCalledWith("categories/1", {
			hasBudgetEnvelope: false
		})
		expect(invalidate).toHaveBeenCalledWith({ queryKey: CATEGORIES_QUERY_KEY })
		expect(invalidate).toHaveBeenCalledWith({ queryKey: EXPENSES_QUERY_KEY })
	})

	it("does not refresh when the request fails", async () => {
		vi.spyOn(api, "patch").mockRejectedValue(new Error("404"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useUpdateCategory(), { wrapper })
		await act(async () => {
			await result.current
				.mutateAsync({ id: "1", hasBudgetEnvelope: false })
				.catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})

describe("useDeleteCategory", () => {
	it("deletes the item and refreshes the list only", async () => {
		const del = vi.spyOn(api, "delete").mockResolvedValue(undefined)
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useDeleteCategory(), { wrapper })
		await act(() => result.current.mutateAsync("1"))

		expect(del).toHaveBeenCalledWith("categories/1")
		expect(invalidate).toHaveBeenCalledTimes(1)
		expect(invalidate).toHaveBeenCalledWith({ queryKey: CATEGORIES_QUERY_KEY })
	})

	it("does not refresh when the request fails", async () => {
		vi.spyOn(api, "delete").mockRejectedValue(new Error("409"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useDeleteCategory(), { wrapper })
		await act(async () => {
			await result.current.mutateAsync("1").catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})
