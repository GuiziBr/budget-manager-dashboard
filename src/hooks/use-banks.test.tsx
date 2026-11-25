// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { LOOKUP_STALE_TIME_MS } from "@/lib/constants"
import { createQueryWrapper } from "@/test/query-wrapper"
import {
	BANKS_QUERY_KEY,
	useBanks,
	useCreateBank,
	useDeleteBank,
	useUpdateBank
} from "./use-banks"
import { EXPENSES_QUERY_KEY } from "./use-expenses"

afterEach(() => {
	vi.restoreAllMocks()
})

describe("useBanks", () => {
	it("loads the list from /banks", async () => {
		const items = [{ id: "1", name: "A" }]
		const get = vi.spyOn(api, "get").mockResolvedValue(items)
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useBanks(), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(items)
		expect(get).toHaveBeenCalledWith("banks")
	})

	it("caches the list under its key for the lookup stale time", async () => {
		vi.spyOn(api, "get").mockResolvedValue([])
		const { wrapper, queryClient } = createQueryWrapper()

		const { result } = renderHook(() => useBanks(), { wrapper })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		const query = queryClient
			.getQueryCache()
			.find({ queryKey: BANKS_QUERY_KEY })
		expect(query).toBeDefined()
		expect(query?.observers[0]?.options.staleTime).toBe(LOOKUP_STALE_TIME_MS)
	})

	it("exposes the error when the request fails", async () => {
		vi.spyOn(api, "get").mockRejectedValue(new Error("boom"))
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useBanks(), { wrapper })

		await waitFor(() => expect(result.current.isError).toBe(true))
	})
})

describe("useCreateBank", () => {
	it("posts the item and refreshes the list only", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue({ id: "1" })
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")
		const input = { name: "Rent" }

		const { result } = renderHook(() => useCreateBank(), { wrapper })
		await act(() => result.current.mutateAsync(input))

		expect(post).toHaveBeenCalledWith("banks", input)
		expect(invalidate).toHaveBeenCalledTimes(1)
		expect(invalidate).toHaveBeenCalledWith({ queryKey: BANKS_QUERY_KEY })
	})

	it("does not refresh when the request fails", async () => {
		vi.spyOn(api, "post").mockRejectedValue(new Error("409"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useCreateBank(), { wrapper })
		await act(async () => {
			await result.current.mutateAsync({ name: "Rent" }).catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})

describe("useUpdateBank", () => {
	it("patches only the given fields and refreshes the list and the expenses", async () => {
		const patch = vi.spyOn(api, "patch").mockResolvedValue({ id: "1" })
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useUpdateBank(), { wrapper })
		await act(() => result.current.mutateAsync({ id: "1", name: "Renamed" }))

		expect(patch).toHaveBeenCalledWith("banks/1", { name: "Renamed" })
		expect(invalidate).toHaveBeenCalledWith({ queryKey: BANKS_QUERY_KEY })
		expect(invalidate).toHaveBeenCalledWith({ queryKey: EXPENSES_QUERY_KEY })
	})

	it("does not refresh when the request fails", async () => {
		vi.spyOn(api, "patch").mockRejectedValue(new Error("404"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useUpdateBank(), { wrapper })
		await act(async () => {
			await result.current
				.mutateAsync({ id: "1", name: "Renamed" })
				.catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})

describe("useDeleteBank", () => {
	it("deletes the item and refreshes the list only", async () => {
		const del = vi.spyOn(api, "delete").mockResolvedValue(undefined)
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useDeleteBank(), { wrapper })
		await act(() => result.current.mutateAsync("1"))

		expect(del).toHaveBeenCalledWith("banks/1")
		expect(invalidate).toHaveBeenCalledTimes(1)
		expect(invalidate).toHaveBeenCalledWith({ queryKey: BANKS_QUERY_KEY })
	})

	it("does not refresh when the request fails", async () => {
		vi.spyOn(api, "delete").mockRejectedValue(new Error("409"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useDeleteBank(), { wrapper })
		await act(async () => {
			await result.current.mutateAsync("1").catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})
