// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import {
	BUDGET_ENVELOPES_QUERY_KEY,
	envelopeQueryKey,
	useBudgetEnvelope,
	useCreateEnvelope,
	useDeleteEnvelope,
	useMonthEnvelopes
} from "./use-budget-envelopes"

afterEach(() => {
	vi.restoreAllMocks()
})

const envelope = {
	id: "e1",
	budgetPeriodId: "p1",
	categoryId: "c1",
	allocatedAmount: 300,
	spentAmount: 245.18,
	spendUpdatedAt: "2026-11-02T14:03:11.000Z",
	createdAt: "2026-11-01T00:00:00.000Z",
	updatedAt: "2026-11-01T00:00:00.000Z",
	deletedAt: null
}

describe("useMonthEnvelopes", () => {
	it("loads the envelopes of the month", async () => {
		const get = vi.spyOn(api, "get").mockResolvedValue([envelope])
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useMonthEnvelopes("p1"), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual([envelope])
		expect(get).toHaveBeenCalledWith("budget-envelopes?budgetPeriodId=p1")
	})

	it("passes through a null spend when the spend service is down", async () => {
		const unavailable = { ...envelope, spentAmount: null, spendUpdatedAt: null }
		vi.spyOn(api, "get").mockResolvedValue([unavailable])
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useMonthEnvelopes("p1"), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.[0].spentAmount).toBeNull()
	})

	it("does not request anything until the month is known", () => {
		const get = vi.spyOn(api, "get").mockResolvedValue([])
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useMonthEnvelopes(undefined), {
			wrapper
		})

		expect(result.current.fetchStatus).toBe("idle")
		expect(get).not.toHaveBeenCalled()
	})

	it("refetches on window focus once the data is stale", async () => {
		const get = vi.spyOn(api, "get").mockResolvedValue([envelope])
		const { wrapper, queryClient } = createQueryWrapper()
		queryClient.setDefaultOptions({
			queries: { retry: false, staleTime: 0 }
		})

		const { result } = renderHook(() => useMonthEnvelopes("p1"), { wrapper })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		act(() => {
			window.dispatchEvent(new Event("visibilitychange"))
		})

		await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
	})

	it("exposes the error when the request fails", async () => {
		vi.spyOn(api, "get").mockRejectedValue(new Error("boom"))
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useMonthEnvelopes("p1"), { wrapper })

		await waitFor(() => expect(result.current.isError).toBe(true))
	})
})

describe("useCreateEnvelope", () => {
	it("posts the envelope and refreshes every envelope query", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue(envelope)
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")
		const input = {
			budgetPeriodId: "p1",
			categoryId: "c1",
			allocatedAmount: 300
		}

		const { result } = renderHook(() => useCreateEnvelope(), { wrapper })
		await act(() => result.current.mutateAsync(input))

		expect(post).toHaveBeenCalledWith("budget-envelopes", input)
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: BUDGET_ENVELOPES_QUERY_KEY
		})
	})

	it("does not refresh when the envelope already exists (409)", async () => {
		vi.spyOn(api, "post").mockRejectedValue(new Error("409"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useCreateEnvelope(), { wrapper })
		await act(async () => {
			await result.current
				.mutateAsync({
					budgetPeriodId: "p1",
					categoryId: "c1",
					allocatedAmount: 1
				})
				.catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})

describe("useDeleteEnvelope", () => {
	it("deletes the envelope and refreshes every envelope query", async () => {
		const del = vi.spyOn(api, "delete").mockResolvedValue(undefined)
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useDeleteEnvelope(), { wrapper })
		await act(() => result.current.mutateAsync("e1"))

		expect(del).toHaveBeenCalledWith("budget-envelopes/e1")
		expect(invalidate).toHaveBeenCalledWith({
			queryKey: BUDGET_ENVELOPES_QUERY_KEY
		})
	})

	it("does not refresh when the request fails", async () => {
		vi.spyOn(api, "delete").mockRejectedValue(new Error("422"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useDeleteEnvelope(), { wrapper })
		await act(async () => {
			await result.current.mutateAsync("e1").catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})

describe("useBudgetEnvelope", () => {
	it("loads one envelope by id, spend included", async () => {
		const get = vi.spyOn(api, "get").mockResolvedValue(envelope)
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useBudgetEnvelope("e1"), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.spentAmount).toBe(245.18)
		expect(get).toHaveBeenCalledWith("budget-envelopes/e1")
	})

	it("doesn't ask again for an envelope the screen already cached", () => {
		const get = vi.spyOn(api, "get")
		const { wrapper, queryClient } = createQueryWrapper()
		queryClient.setQueryData(envelopeQueryKey("e1"), envelope)

		const { result } = renderHook(() => useBudgetEnvelope("e1"), { wrapper })

		expect(result.current.data?.id).toBe("e1")
		expect(get).not.toHaveBeenCalled()
	})

	it("doesn't request anything without an id", () => {
		const get = vi.spyOn(api, "get")
		const { wrapper } = createQueryWrapper()

		renderHook(() => useBudgetEnvelope(undefined), { wrapper })

		expect(get).not.toHaveBeenCalled()
	})
})
