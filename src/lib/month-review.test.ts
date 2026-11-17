import { describe, expect, it } from "vitest"
import type { Expense } from "@/types"
import {
	amountToInput,
	diffBillAmounts,
	isLastPayment,
	splitReviewExpenses
} from "./month-review"

function expense(id: string, overrides: Partial<Expense> = {}): Expense {
	return {
		id,
		budgetPeriodId: "p1",
		recurringExpenseId: null,
		description: id,
		installmentNumber: null,
		purchasedAt: null,
		dueAt: null,
		paidAt: null,
		amount: 100,
		category: { id: "c1", name: "Bills" },
		paymentType: { id: "t1", name: "Card" },
		bank: null,
		store: null,
		installment: null,
		monthsRunning: null,
		createdAt: "2026-12-01T00:00:00.000Z",
		updatedAt: "2026-12-01T00:00:00.000Z",
		deletedAt: null,
		...overrides
	}
}

const plan = {
	id: "g1",
	totalInstallments: 104,
	paymentIntervalDays: 14,
	firstPurchasedAt: "2024-01-01"
}

describe("splitReviewExpenses", () => {
	it("separates bills and installments, each A to Z, and drops the rest", () => {
		const result = splitReviewExpenses([
			expense("Hydro", { recurringExpenseId: "r1" }),
			expense("Car finance", { installment: plan, installmentNumber: 79 }),
			expense("Coffee"),
			expense("Internet", { recurringExpenseId: "r2" }),
			expense("Array", { installment: plan, installmentNumber: 3 })
		])
		expect(result.bills.map((e) => e.id)).toEqual(["Hydro", "Internet"])
		expect(result.installments.map((e) => e.id)).toEqual([
			"Array",
			"Car finance"
		])
	})

	it("returns empty lists for an empty month", () => {
		expect(splitReviewExpenses([])).toEqual({ bills: [], installments: [] })
	})
})

describe("isLastPayment", () => {
	it("is true only on the final payment of a plan", () => {
		expect(
			isLastPayment(expense("a", { installment: plan, installmentNumber: 104 }))
		).toBe(true)
		expect(
			isLastPayment(expense("a", { installment: plan, installmentNumber: 103 }))
		).toBe(false)
		expect(isLastPayment(expense("a"))).toBe(false)
	})
})

describe("amountToInput", () => {
	it("shows two decimals and thousands separators", () => {
		expect(amountToInput(105)).toBe("105.00")
		expect(amountToInput(1450.5)).toBe("1,450.50")
	})
})

describe("diffBillAmounts", () => {
	const hydro = expense("hydro", { amount: 105 })
	const rent = expense("rent", { amount: 1200 })

	it("reports the rows whose amount changed", () => {
		expect(diffBillAmounts([hydro, rent], { hydro: "112.40" })).toEqual({
			changes: [{ id: "hydro", amount: 112.4 }],
			invalidIds: []
		})
	})

	it("ignores untouched rows and edits equal to the saved amount", () => {
		expect(diffBillAmounts([hydro, rent], { rent: "1,200.00" })).toEqual({
			changes: [],
			invalidIds: []
		})
	})

	it("reports invalid text instead of sending it", () => {
		expect(diffBillAmounts([hydro, rent], { hydro: "", rent: "0.00" })).toEqual(
			{ changes: [], invalidIds: ["hydro", "rent"] }
		)
	})
})
