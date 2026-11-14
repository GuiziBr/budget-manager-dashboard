import { describe, expect, it } from "vitest"
import type { Expense } from "@/types"
import { deleteMessage } from "./expense-delete"

const base = {
	id: "e1",
	description: "Hydro bill",
	recurringExpenseId: null,
	installmentNumber: null,
	installment: null
} as unknown as Expense

describe("deleteMessage", () => {
	it("names a one-time expense", () => {
		expect(deleteMessage(base)).toBe(
			"Are you sure you want to delete the one-time expense Hydro bill?"
		)
	})

	it("names an installment", () => {
		const payment = {
			...base,
			description: "Car finance",
			installmentNumber: 2,
			installment: { totalInstallments: 4 }
		} as unknown as Expense
		expect(deleteMessage(payment)).toBe(
			"Are you sure you want to delete the installment Car finance?"
		)
	})

	it("names a recurring expense", () => {
		const bill = { ...base, recurringExpenseId: "r1" } as Expense
		expect(deleteMessage(bill)).toBe(
			"Are you sure you want to delete the recurring expense Hydro bill?"
		)
	})
})
