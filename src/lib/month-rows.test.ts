import { describe, expect, it } from "vitest"
import type { BudgetEnvelope, Expense, Income } from "@/types"
import {
	buildRows,
	envelopeStatus,
	installmentEndDate,
	isOverdue,
	isUnpaid,
	rowType,
	sortEnvelopes,
	totals
} from "./month-rows"

const NOW = new Date("2026-11-15T10:00:00.000Z")

function expense(overrides: Partial<Expense> = {}): Expense {
	return {
		id: "e1",
		budgetPeriodId: "p1",
		recurringExpenseId: null,
		description: "Groceries",
		installmentNumber: null,
		purchasedAt: null,
		dueAt: null,
		paidAt: null,
		amount: 50,
		category: { id: "c1", name: "Food" },
		paymentType: { id: "t1", name: "Credit Card" },
		bank: { id: "b1", name: "CIBC" },
		store: null,
		installment: null,
		monthsRunning: null,
		createdAt: "2026-11-01T00:00:00.000Z",
		updatedAt: "2026-11-01T00:00:00.000Z",
		deletedAt: null,
		...overrides
	}
}

function installmentExpense(number: number, total = 104): Expense {
	return expense({
		id: `i${number}`,
		description: "Car finance",
		installmentNumber: number,
		installment: {
			id: "g1",
			totalInstallments: total,
			paymentIntervalDays: 14,
			firstPurchasedAt: "2023-11-10T00:00:00.000Z"
		}
	})
}

function envelope(overrides: Partial<BudgetEnvelope> = {}): BudgetEnvelope {
	return {
		id: "v1",
		budgetPeriodId: "p1",
		categoryId: "c1",
		allocatedAmount: 100,
		spentAmount: 40,
		spendUpdatedAt: "2026-11-02T14:00:00.000Z",
		createdAt: "2026-11-01T00:00:00.000Z",
		updatedAt: "2026-11-01T00:00:00.000Z",
		deletedAt: null,
		...overrides
	}
}

function income(amount: number, isSalary = false): Income {
	return {
		id: `n${amount}`,
		budgetPeriodId: "p1",
		description: isSalary ? "Salary" : "Refund",
		amount,
		isSalary,
		receivedAt: null,
		createdAt: "2026-11-01T00:00:00.000Z",
		updatedAt: "2026-11-01T00:00:00.000Z",
		deletedAt: null
	}
}

describe("rowType", () => {
	it("tells the three types apart", () => {
		expect(rowType(expense())).toBe("one-time")
		expect(rowType(expense({ recurringExpenseId: "r1" }))).toBe("recurring")
		expect(rowType(installmentExpense(3, 12))).toBe("installment")
	})
})

describe("isUnpaid", () => {
	it("is true without a paid date", () => {
		expect(isUnpaid(expense())).toBe(true)
		expect(isUnpaid(expense({ paidAt: "2026-11-01T00:00:00.000Z" }))).toBe(
			false
		)
	})
})

describe("isOverdue", () => {
	it("flags an unpaid row due before today", () => {
		const hydro = expense({ dueAt: "2026-11-12T00:00:00.000Z" })
		expect(isOverdue(hydro, NOW)).toBe(true)
	})

	it("does not flag a paid row", () => {
		const hydro = expense({
			dueAt: "2026-11-12T00:00:00.000Z",
			paidAt: "2026-11-13T00:00:00.000Z"
		})
		expect(isOverdue(hydro, NOW)).toBe(false)
	})

	it("does not flag a row due today or later", () => {
		expect(isOverdue(expense({ dueAt: "2026-11-15T00:00:00.000Z" }), NOW)).toBe(
			false
		)
		expect(isOverdue(expense({ dueAt: "2026-11-20T00:00:00.000Z" }), NOW)).toBe(
			false
		)
	})

	it("does not flag a row without a due date", () => {
		expect(isOverdue(expense(), NOW)).toBe(false)
	})

	it("flags an unpaid row of a past month", () => {
		const october = expense({
			budgetPeriodId: "october",
			dueAt: "2026-10-28T00:00:00.000Z"
		})
		expect(isOverdue(october, NOW)).toBe(true)
	})

	it("compares UTC days, not local ones", () => {
		const lateOnThe14th = new Date("2026-11-14T23:59:59.000Z")
		const due = expense({ dueAt: "2026-11-14T00:00:00.000Z" })
		expect(isOverdue(due, lateOnThe14th)).toBe(false)
		expect(isOverdue(due, new Date("2026-11-15T00:00:00.000Z"))).toBe(true)
	})
})

describe("buildRows", () => {
	it("keeps the order the API returned", () => {
		const page = [
			expense({ id: "b" }),
			expense({ id: "a" }),
			expense({ id: "c" })
		]
		expect(buildRows(page, NOW).map((r) => r.expense.id)).toEqual([
			"b",
			"a",
			"c"
		])
	})

	it("takes names from the expense, bank and store may be empty", () => {
		const [row] = buildRows(
			[expense({ store: { id: "s1", name: "Costco" } })],
			NOW
		)
		expect(row).toMatchObject({
			type: "one-time",
			category: "Food",
			paymentType: "Credit Card",
			bank: "CIBC",
			store: "Costco",
			installment: null,
			monthsRunning: null
		})
		const [bare] = buildRows([expense({ bank: null })], NOW)
		expect(bare.bank).toBeNull()
		expect(bare.store).toBeNull()
	})

	it("shows two payments of a 14-day plan as n of N", () => {
		const rows = buildRows(
			[installmentExpense(78), installmentExpense(79)],
			NOW
		)
		expect(rows.map((r) => r.installment?.number)).toEqual([78, 79])
		expect(rows.every((r) => r.installment?.total === 104)).toBe(true)
		expect(rows[0].installment).toMatchObject({
			paymentIntervalDays: 14,
			firstPurchasedAt: "2023-11-10T00:00:00.000Z"
		})
		expect(rows[0].type).toBe("installment")
	})

	it("passes the months running count through", () => {
		const [row] = buildRows(
			[expense({ recurringExpenseId: "r1", monthsRunning: 11 })],
			NOW
		)
		expect(row.type).toBe("recurring")
		expect(row.monthsRunning).toBe(11)
	})

	it("flags unpaid and overdue rows", () => {
		const [row] = buildRows(
			[expense({ dueAt: "2026-11-12T00:00:00.000Z" })],
			NOW
		)
		expect(row.unpaid).toBe(true)
		expect(row.overdue).toBe(true)
	})

	it("does not mutate its input", () => {
		const page = [expense()]
		const copy = structuredClone(page)
		buildRows(page, NOW)
		expect(page).toEqual(copy)
	})
})

describe("installmentEndDate", () => {
	it("adds (N - 1) intervals to the first purchase", () => {
		expect(
			installmentEndDate({
				firstPurchasedAt: "2023-11-10T00:00:00.000Z",
				totalInstallments: 104,
				paymentIntervalDays: 14
			})
		).toBe("2027-10-22")
		expect(
			installmentEndDate({
				firstPurchasedAt: "2026-11-15",
				totalInstallments: 12,
				paymentIntervalDays: 30
			})
		).toBe("2027-10-11")
	})

	it("accepts the plan returned with an expense", () => {
		const plan = installmentExpense(1, 3).installment
		expect(plan && installmentEndDate(plan)).toBe("2023-12-08")
	})
})

describe("envelopeStatus", () => {
	const names = new Map([["c1", "Groceries"]])

	it("computes the ratio and names the category", () => {
		expect(envelopeStatus(envelope({ spentAmount: 40 }), names)).toMatchObject({
			categoryName: "Groceries",
			allocated: 100,
			spent: 40,
			ratio: 0.4,
			overBudget: false
		})
	})

	it("is over budget only above the allocation", () => {
		const over = envelopeStatus(envelope({ spentAmount: 120 }), names)
		expect(over.overBudget).toBe(true)
		expect(over.ratio).toBeCloseTo(1.2)
		expect(
			envelopeStatus(envelope({ spentAmount: 100 }), names).overBudget
		).toBe(false)
	})

	it("has no ratio when the allocation is 0", () => {
		const status = envelopeStatus(
			envelope({ allocatedAmount: 0, spentAmount: 10 }),
			names
		)
		expect(status.ratio).toBeNull()
		expect(status.overBudget).toBe(true)
	})

	it("keeps spend unavailable as null and never over budget", () => {
		const status = envelopeStatus(
			envelope({ spentAmount: null, spendUpdatedAt: null }),
			names
		)
		expect(status.spent).toBeNull()
		expect(status.ratio).toBeNull()
		expect(status.overBudget).toBe(false)
	})

	it("leaves the category name empty when it is no longer listed", () => {
		expect(
			envelopeStatus(envelope({ categoryId: "gone" }), names).categoryName
		).toBeNull()
	})
})

describe("sortEnvelopes", () => {
	const names = new Map<string, string>()
	const status = (id: string, spentAmount: number | null) =>
		envelopeStatus(envelope({ id, spentAmount }), names)

	it("puts over-budget envelopes first, keeping the order inside each group", () => {
		const input = [
			status("a", 10),
			status("b", 150),
			status("c", 20),
			status("d", 200),
			status("e", null)
		]
		expect(sortEnvelopes(input).map((s) => s.envelope.id)).toEqual([
			"b",
			"d",
			"a",
			"c",
			"e"
		])
	})

	it("does not mutate its input", () => {
		const input = [status("a", 10), status("b", 150)]
		sortEnvelopes(input)
		expect(input.map((s) => s.envelope.id)).toEqual(["a", "b"])
	})
})

describe("totals", () => {
	it("adds envelope spend to the month's expense total", () => {
		const result = totals({
			expenseTotal: 6013.62,
			envelopes: [
				envelope({ id: "a", spentAmount: 300.5 }),
				envelope({ id: "b", spentAmount: 216.36 })
			],
			incomes: [income(7375.67)]
		})
		expect(result.income).toBe(7375.67)
		expect(result.expenses).toBe(6530.48)
		expect(result.balance).toBe(845.19)
		expect(result.spendComplete).toBe(true)
	})

	it("goes negative when expenses exceed income", () => {
		const result = totals({
			expenseTotal: 1120,
			envelopes: [],
			incomes: [income(1000)]
		})
		expect(result.balance).toBe(-120)
	})

	it("sums the salary incomes into the salary base", () => {
		const result = totals({
			expenseTotal: 0,
			envelopes: [],
			incomes: [income(3000, true), income(3144, true), income(50)]
		})
		expect(result.salaryBase).toBe(6144)
		expect(result.income).toBe(6194)
	})

	it("counts unavailable spend as 0 and says the total is incomplete", () => {
		const result = totals({
			expenseTotal: 500,
			envelopes: [
				envelope({ id: "a", spentAmount: null, spendUpdatedAt: null }),
				envelope({ id: "b", spentAmount: 20 })
			],
			incomes: []
		})
		expect(result.expenses).toBe(520)
		expect(result.spendComplete).toBe(false)
	})

	it("is complete when the month has no envelopes", () => {
		const result = totals({ expenseTotal: 0, envelopes: [], incomes: [] })
		expect(result).toEqual({
			income: 0,
			expenses: 0,
			balance: 0,
			salaryBase: 0,
			spendComplete: true
		})
	})

	it("avoids floating point drift", () => {
		const result = totals({
			expenseTotal: 0.1,
			envelopes: [envelope({ spentAmount: 0.2 })],
			incomes: [income(0.3)]
		})
		expect(result.expenses).toBe(0.3)
		expect(result.balance).toBe(0)
	})
})
