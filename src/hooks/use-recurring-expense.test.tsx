// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import { useRecurringExpense } from "./use-recurring-expense"

afterEach(() => {
	vi.restoreAllMocks()
})

const bill = {
	id: "r1",
	categoryId: "c1",
	paymentTypeId: "pt1",
	bankId: null,
	storeId: null,
	description: "Hydro",
	amount: 120,
	startedAt: "2026-01-01",
	cancelledAt: null,
	monthsAlreadyPaid: 0,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	deletedAt: null
}

describe("useRecurringExpense", () => {
	it("loads the bill by id", async () => {
		const get = vi.spyOn(api, "get").mockResolvedValue(bill)
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useRecurringExpense("r1"), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(bill)
		expect(get).toHaveBeenCalledWith("recurring-expenses/r1")
	})

	it("does not request anything without an id", () => {
		const get = vi.spyOn(api, "get")
		const { wrapper } = createQueryWrapper()

		renderHook(() => useRecurringExpense(undefined), { wrapper })

		expect(get).not.toHaveBeenCalled()
	})
})
