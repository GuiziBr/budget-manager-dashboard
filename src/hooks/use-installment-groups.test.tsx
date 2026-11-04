// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import {
	INSTALLMENT_GROUPS_QUERY_KEY,
	useInstallmentGroup,
	useUpdateInstallmentGroup
} from "./use-installment-groups"

afterEach(() => {
	vi.restoreAllMocks()
})

const group = {
	id: "g1",
	description: "Car finance",
	amountPerInstallment: 450,
	totalInstallments: 80,
	paymentIntervalDays: 30,
	firstPurchasedAt: "2020-05-10",
	createdAt: "2020-05-10T00:00:00.000Z",
	updatedAt: "2020-05-10T00:00:00.000Z",
	deletedAt: null
}

describe("useInstallmentGroup", () => {
	it("loads the plan by id", async () => {
		const get = vi.spyOn(api, "get").mockResolvedValue(group)
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useInstallmentGroup("g1"), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(group)
		expect(get).toHaveBeenCalledWith("installment-groups/g1")
	})

	it("does not request anything while no plan is open", () => {
		const get = vi.spyOn(api, "get").mockResolvedValue(group)
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useInstallmentGroup(undefined), {
			wrapper
		})

		expect(result.current.fetchStatus).toBe("idle")
		expect(get).not.toHaveBeenCalled()
	})

	it("exposes the error when the plan is gone (404)", async () => {
		vi.spyOn(api, "get").mockRejectedValue(new Error("404"))
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useInstallmentGroup("g1"), { wrapper })

		await waitFor(() => expect(result.current.isError).toBe(true))
	})
})

describe("useUpdateInstallmentGroup", () => {
	it("patches the amount without the id in the body", async () => {
		const patch = vi
			.spyOn(api, "patch")
			.mockResolvedValue({ ...group, amountPerInstallment: 480 })
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useUpdateInstallmentGroup(), {
			wrapper
		})
		await act(() =>
			result.current.mutateAsync({ id: "g1", amountPerInstallment: 480 })
		)

		expect(patch).toHaveBeenCalledWith("installment-groups/g1", {
			amountPerInstallment: 480
		})
	})

	it("refreshes the plan and every expense query", async () => {
		vi.spyOn(api, "patch").mockResolvedValue(group)
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useUpdateInstallmentGroup(), {
			wrapper
		})
		await act(() =>
			result.current.mutateAsync({ id: "g1", amountPerInstallment: 480 })
		)

		expect(invalidate).toHaveBeenCalledWith({
			queryKey: INSTALLMENT_GROUPS_QUERY_KEY
		})
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ["expenses"] })
	})

	it("refetches expense pages already in the cache", async () => {
		vi.spyOn(api, "patch").mockResolvedValue(group)
		const { wrapper, queryClient } = createQueryWrapper()
		queryClient.setQueryData(["expenses", "month", "p1", { page: 1 }], {
			data: []
		})
		queryClient.setQueryData(["expenses", "month", "p2", { page: 1 }], {
			data: []
		})

		const { result } = renderHook(() => useUpdateInstallmentGroup(), {
			wrapper
		})
		await act(() =>
			result.current.mutateAsync({ id: "g1", amountPerInstallment: 480 })
		)

		for (const periodId of ["p1", "p2"]) {
			expect(
				queryClient.getQueryState(["expenses", "month", periodId, { page: 1 }])
					?.isInvalidated
			).toBe(true)
		}
	})

	it("does not refresh anything when the request fails", async () => {
		vi.spyOn(api, "patch").mockRejectedValue(new Error("400"))
		const { wrapper, queryClient } = createQueryWrapper()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useUpdateInstallmentGroup(), {
			wrapper
		})
		await act(async () => {
			await result.current
				.mutateAsync({ id: "g1", amountPerInstallment: 1 })
				.catch(() => {})
		})

		expect(invalidate).not.toHaveBeenCalled()
	})
})
