// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach, describe, expect, it, vi } from "vitest"
import { expenseQueryKey } from "@/hooks/use-expenses"
import { useLinkedSelectionSync } from "@/hooks/use-linked-selection-sync"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import type { Expense } from "@/types"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

afterEach(() => vi.restoreAllMocks())

const month = { year: 2026, month: 11 }
const VALID_ID = "11111111-1111-4111-8111-111111111111"

const expense = (patch: Partial<Expense> = {}): Expense => ({
	id: VALID_ID,
	budgetPeriodId: "p1",
	recurringExpenseId: null,
	description: "Hydro bill",
	installmentNumber: null,
	purchasedAt: null,
	dueAt: null,
	paidAt: null,
	amount: 100,
	category: { id: "c1", name: "Utilities" },
	paymentType: { id: "t1", name: "Debit" },
	bank: null,
	store: null,
	installment: null,
	monthsRunning: null,
	createdAt: "",
	updatedAt: "",
	deletedAt: null,
	...patch
})

const setup = (id = VALID_ID) => {
	const { queryClient, wrapper } = createQueryWrapper()
	const clear = vi.fn()
	const moveToMonth = vi.fn()
	vi.spyOn(api, "get").mockImplementation(((endpoint: string) =>
		endpoint.includes("budget-periods")
			? Promise.resolve([{ id: "p1", year: 2026, month: 11 }])
			: Promise.reject(new Error("unexpected"))) as never)
	renderHook(
		() =>
			useLinkedSelectionSync({
				selection: { kind: "expense", id },
				month,
				moveToMonth,
				clear
			}),
		{ wrapper }
	)
	return { queryClient, clear, moveToMonth }
}

describe("useLinkedSelectionSync", () => {
	it("keeps the panel open when a background refetch fails but data remains", async () => {
		const { queryClient, clear } = setup()
		queryClient.setQueryData(expenseQueryKey(VALID_ID), expense())

		await queryClient.refetchQueries({ queryKey: expenseQueryKey(VALID_ID) })
		vi.spyOn(api, "get").mockRejectedValue(new ApiError("boom", 500))
		await queryClient.refetchQueries({ queryKey: expenseQueryKey(VALID_ID) })

		expect(clear).not.toHaveBeenCalled()
		expect(toast.error).not.toHaveBeenCalled()
	})

	it("closes the panel when the expense is gone (404) even with stale data", async () => {
		const { queryClient, clear } = setup()
		queryClient.setQueryData(expenseQueryKey(VALID_ID), expense())

		vi.spyOn(api, "get").mockRejectedValue(new ApiError("not found", 404))
		await queryClient.refetchQueries({ queryKey: expenseQueryKey(VALID_ID) })

		await vi.waitFor(() => expect(clear).toHaveBeenCalled())
		expect(toast.error).toHaveBeenCalledWith("This expense no longer exists.", {
			id: "linked-selection"
		})
	})

	it("closes the panel on a server error with no data to fall back on", async () => {
		const otherId = "22222222-2222-4222-8222-222222222222"
		const { clear } = setup(otherId)
		vi.spyOn(api, "get").mockRejectedValue(new ApiError("boom", 500))

		await vi.waitFor(() => expect(clear).toHaveBeenCalled())
		expect(toast.error).toHaveBeenCalledWith(
			"Something went wrong. Try again.",
			{ id: "linked-selection" }
		)
	})

	it("closes the panel without requesting an id that isn't a UUID (e.g. a tampered link)", async () => {
		const { clear } = setup("..%2Fcategories")

		await vi.waitFor(() => expect(clear).toHaveBeenCalled())
		expect(toast.error).toHaveBeenCalledWith("This expense no longer exists.", {
			id: "linked-selection"
		})
		expect(api.get).not.toHaveBeenCalledWith(
			expect.stringContaining("expenses/")
		)
	})
})
