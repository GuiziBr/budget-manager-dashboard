// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { LOOKUP_STALE_TIME_MS } from "@/lib/constants"
import { createQueryWrapper } from "@/test/query-wrapper"
import { EXPENSES_QUERY_KEY } from "./use-expenses"
import {
	PAYMENT_TYPES_QUERY_KEY,
	useCreatePaymentType,
	useDeletePaymentType,
	usePaymentTypes,
	useUpdatePaymentType
} from "./use-payment-types"

afterEach(() => {
	vi.restoreAllMocks()
})

describe("usePaymentTypes", () => {
	it("loads the list from /payment-types", async () => {
		const items = [{ id: "1", name: "A" }]
		const get = vi.spyOn(api, "get").mockResolvedValue(items)
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => usePaymentTypes(), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(items)
		expect(get).toHaveBeenCalledWith("payment-types")
	})

	it("caches the list under its key for the lookup stale time", async () => {
		vi.spyOn(api, "get").mockResolvedValue([])
		const { wrapper, queryClient } = createQueryWrapper()

		const { result } = renderHook(() => usePaymentTypes(), { wrapper })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		const query = queryClient
			.getQueryCache()
			.find({ queryKey: PAYMENT_TYPES_QUERY_KEY })
		expect(query).toBeDefined()
		expect(query?.observers[0]?.options.staleTime).toBe(LOOKUP_STALE_TIME_MS)
	})

	it("exposes the error when the request fails", async () => {
		vi.spyOn(api, "get").mockRejectedValue(new Error("boom"))
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => usePaymentTypes(), { wrapper })

		await waitFor(() => expect(result.current.isError).toBe(true))
	})
})

describe("useCreatePaymentType", () => {
	it("posts the item and refreshes the list only", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue({ id: "1" })
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")
		const input = { name: "Cash", hasStatement: false }

		const { result } = renderHook(() => useCreatePaymentType(), { wrapper })
		await act(() => result.current.mutateAsync(input))

		expect(post).toHaveBeenCalledWith("payment-types", input)
		expect(invalidate).toHaveBeenCalledTimes(1)
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: PAYMENT_TYPES_QUERY_KEY
		})
	})

	it("does not refresh when the request fails", async () => {
		vi.spyOn(api, "post").mockRejectedValue(new Error("409"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useCreatePaymentType(), { wrapper })
		await act(async () => {
			await result.current
				.mutateAsync({ name: "Cash", hasStatement: false })
				.catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})

describe("useUpdatePaymentType", () => {
	it("patches only the given fields and refreshes the list and the expenses", async () => {
		const patch = vi.spyOn(api, "patch").mockResolvedValue({ id: "1" })
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useUpdatePaymentType(), { wrapper })
		await act(() => result.current.mutateAsync({ id: "1", hasStatement: true }))

		expect(patch).toHaveBeenCalledWith("payment-types/1", {
			hasStatement: true
		})
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: PAYMENT_TYPES_QUERY_KEY
		})
		expect(invalidate).toHaveBeenCalledWith({ queryKey: EXPENSES_QUERY_KEY })
	})

	it("does not refresh when the request fails", async () => {
		vi.spyOn(api, "patch").mockRejectedValue(new Error("404"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useUpdatePaymentType(), { wrapper })
		await act(async () => {
			await result.current
				.mutateAsync({ id: "1", hasStatement: true })
				.catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})

describe("useDeletePaymentType", () => {
	it("deletes the item and refreshes the list only", async () => {
		const del = vi.spyOn(api, "delete").mockResolvedValue(undefined)
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useDeletePaymentType(), { wrapper })
		await act(() => result.current.mutateAsync("1"))

		expect(del).toHaveBeenCalledWith("payment-types/1")
		expect(invalidate).toHaveBeenCalledTimes(1)
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: PAYMENT_TYPES_QUERY_KEY
		})
	})

	it("does not refresh when the request fails", async () => {
		vi.spyOn(api, "delete").mockRejectedValue(new Error("409"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useDeletePaymentType(), { wrapper })
		await act(async () => {
			await result.current.mutateAsync("1").catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})
