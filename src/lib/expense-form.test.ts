import { describe, expect, it } from "vitest"
import type { Expense } from "@/types"
import {
	afterAddAnother,
	buildCreateExpenseInput,
	buildUpdateExpenseInput,
	createExpenseFormSchema,
	EMPTY_EXPENSE_FORM,
	type ExpenseFormValues,
	expenseToFormValues
} from "./expense-form"

const filled: ExpenseFormValues = {
	...EMPTY_EXPENSE_FORM,
	description: "  Groceries ",
	categoryId: "c1",
	paymentTypeId: "card",
	bankId: "b1",
	storeId: "s1",
	amount: "25.00",
	purchasedAt: "2026-11-04",
	dueAt: "",
	paidAt: ""
}

const schema = createExpenseFormSchema((id) => id === "card")

const messages = (values: ExpenseFormValues) => {
	const result = schema.safeParse(values)
	if (result.success) return {}
	return Object.fromEntries(
		result.error.issues.map((issue) => [issue.path[0], issue.message])
	)
}

describe("createExpenseFormSchema", () => {
	it("accepts a complete expense", () => {
		expect(schema.safeParse(filled).success).toBe(true)
	})

	it("asks for the required fields", () => {
		expect(messages(EMPTY_EXPENSE_FORM)).toEqual({
			description: "Enter a description.",
			categoryId: "Choose a category.",
			paymentTypeId: "Choose a payment type.",
			amount: "Enter an amount above 0, up to 2 decimals."
		})
	})

	it("rejects a description of only spaces", () => {
		expect(messages({ ...filled, description: "   " }).description).toBe(
			"Enter a description."
		)
	})

	it("requires a bank when the payment type has a statement", () => {
		expect(messages({ ...filled, bankId: "" })).toEqual({
			bankId: "Bank is required for this payment type."
		})
	})

	it("lets the bank stay empty for other payment types", () => {
		expect(
			schema.safeParse({ ...filled, paymentTypeId: "cash", bankId: "" }).success
		).toBe(true)
	})

	it.each(["0", "-1", "12.345", "abc", ""])(
		"rejects the amount %j",
		(amount) => {
			expect(messages({ ...filled, amount }).amount).toBe(
				"Enter an amount above 0, up to 2 decimals."
			)
		}
	)

	it("rejects an amount above the limit with its own message", () => {
		expect(messages({ ...filled, amount: "100000000" }).amount).toBe(
			"The amount can't be more than 99,999,999.99."
		)
	})
})

describe("purchase date", () => {
	const dated = createExpenseFormSchema((id) => id === "card", "2026-11-10")
	const problems = (purchasedAt: string) => {
		const result = dated.safeParse({ ...filled, purchasedAt })
		return result.success
			? {}
			: Object.fromEntries(
					result.error.issues.map((issue) => [issue.path[0], issue.message])
				)
	}

	it("allows today, earlier days and no date", () => {
		expect(problems("2026-11-10")).toEqual({})
		expect(problems("2026-11-09")).toEqual({})
		expect(problems("")).toEqual({})
	})

	it("rejects a day after today", () => {
		expect(problems("2026-11-11")).toEqual({
			purchasedAt: "The purchase date can't be in the future."
		})
		expect(problems("2027-01-01").purchasedAt).toBeDefined()
	})

	it("doesn't limit the due and paid dates", () => {
		const result = dated.safeParse({
			...filled,
			dueAt: "2027-01-01",
			paidAt: "2027-01-02"
		})
		expect(result.success).toBe(true)
	})
})

describe("buildCreateExpenseInput", () => {
	it("builds a one-time expense in the given month", () => {
		expect(buildCreateExpenseInput(filled, "p1")).toEqual({
			type: "one-time",
			budgetPeriodId: "p1",
			categoryId: "c1",
			paymentTypeId: "card",
			bankId: "b1",
			storeId: "s1",
			description: "Groceries",
			amount: 25,
			purchasedAt: "2026-11-04"
		})
	})

	it("sends an empty bank and store as null and leaves empty dates out", () => {
		const input = buildCreateExpenseInput(
			{ ...filled, bankId: "", storeId: "", purchasedAt: "" },
			"p1"
		)
		expect(input.bankId).toBeNull()
		expect(input.storeId).toBeNull()
		expect(input).not.toHaveProperty("purchasedAt")
		expect(input).not.toHaveProperty("dueAt")
		expect(input).not.toHaveProperty("paidAt")
	})

	it("includes the due and paid dates when set", () => {
		const input = buildCreateExpenseInput(
			{ ...filled, dueAt: "2026-11-20", paidAt: "2026-11-21" },
			"p1"
		)
		expect(input).toMatchObject({ dueAt: "2026-11-20", paidAt: "2026-11-21" })
	})

	it("refuses an invalid amount", () => {
		expect(() =>
			buildCreateExpenseInput({ ...filled, amount: "0" }, "p1")
		).toThrow()
	})
})

describe("afterAddAnother", () => {
	it("keeps only category, payment type and bank for the next expense", () => {
		expect(afterAddAnother(filled)).toEqual({
			...EMPTY_EXPENSE_FORM,
			categoryId: "c1",
			paymentTypeId: "card",
			bankId: "b1"
		})
	})

	it("clears everything else, including the store and the dates", () => {
		const next = afterAddAnother({
			...filled,
			dueAt: "2026-11-20",
			paidAt: "2026-11-21"
		})
		expect(next).toMatchObject({
			description: "",
			amount: "",
			storeId: "",
			purchasedAt: "",
			dueAt: "",
			paidAt: ""
		})
	})
})

describe("installment form", () => {
	const plan: ExpenseFormValues = {
		...filled,
		type: "installment",
		purchasedAt: "",
		amount: "50.00",
		installmentCount: "12",
		intervalPreset: "30",
		customIntervalDays: "",
		firstPurchasedAt: "2026-11-04"
	}
	const planSchema = createExpenseFormSchema(
		(id) => id === "card",
		"2026-11-15"
	)
	const issues = (values: ExpenseFormValues) => {
		const result = planSchema.safeParse(values)
		return result.success
			? {}
			: Object.fromEntries(
					result.error.issues.map((issue) => [issue.path[0], issue.message])
				)
	}

	it("accepts a complete plan", () => {
		expect(planSchema.safeParse(plan).success).toBe(true)
	})

	it("asks for the plan fields", () => {
		expect(
			issues({ ...plan, installmentCount: "", firstPurchasedAt: "" })
		).toEqual({
			installmentCount: "Enter at least 2 payments.",
			firstPurchasedAt: "Choose the first purchase date."
		})
	})

	it("needs at least 2 whole payments", () => {
		for (const count of ["1", "0", "2.5", "-3", "ab"]) {
			expect(issues({ ...plan, installmentCount: count })).toHaveProperty(
				"installmentCount"
			)
		}
	})

	it("needs the days of a custom interval", () => {
		const custom = { ...plan, intervalPreset: "custom" as const }
		expect(issues(custom)).toHaveProperty("customIntervalDays")
		expect(issues({ ...custom, customIntervalDays: "0" })).toHaveProperty(
			"customIntervalDays"
		)
		expect(
			planSchema.safeParse({ ...custom, customIntervalDays: "10" }).success
		).toBe(true)
	})

	it("rejects a first purchase date after today", () => {
		expect(issues({ ...plan, firstPurchasedAt: "2026-11-16" })).toEqual({
			firstPurchasedAt: "The purchase date can't be in the future."
		})
	})

	it("ignores plan fields on a one-time expense and the purchase date on a plan", () => {
		expect(
			planSchema.safeParse({ ...filled, installmentCount: "1" }).success
		).toBe(true)
		expect(
			planSchema.safeParse({ ...plan, purchasedAt: "2030-01-01" }).success
		).toBe(true)
	})

	it("builds the plan body", () => {
		expect(buildCreateExpenseInput(plan, "p1")).toEqual({
			type: "installment",
			budgetPeriodId: "p1",
			categoryId: "c1",
			paymentTypeId: "card",
			bankId: "b1",
			storeId: "s1",
			description: "Groceries",
			amountPerInstallment: 50,
			totalInstallments: 12,
			paymentIntervalDays: 30,
			firstPurchasedAt: "2026-11-04"
		})
	})

	it("uses the custom days and the 14-day preset", () => {
		expect(
			buildCreateExpenseInput({ ...plan, intervalPreset: "14" }, "p1")
		).toMatchObject({ paymentIntervalDays: 14 })
		expect(
			buildCreateExpenseInput(
				{ ...plan, intervalPreset: "custom", customIntervalDays: "45" },
				"p1"
			)
		).toMatchObject({ paymentIntervalDays: 45 })
	})

	it("refuses to build an invalid plan", () => {
		expect(() =>
			buildCreateExpenseInput({ ...plan, installmentCount: "1" }, "p1")
		).toThrow()
	})

	it("keeps the type with Finish & add another and clears the plan", () => {
		expect(afterAddAnother(plan)).toEqual({
			...EMPTY_EXPENSE_FORM,
			type: "installment",
			categoryId: "c1",
			paymentTypeId: "card",
			bankId: "b1"
		})
	})
})

describe("recurring form", () => {
	const bill: ExpenseFormValues = {
		...filled,
		type: "recurring",
		purchasedAt: ""
	}
	const billSchema = createExpenseFormSchema(
		(id) => id === "card",
		"2026-11-15"
	)
	const issues = (values: ExpenseFormValues) => {
		const result = billSchema.safeParse(values)
		if (result.success) return {}
		return Object.fromEntries(
			result.error.issues.map((issue) => [issue.path[0], issue.message])
		)
	}

	it("accepts a complete bill", () => {
		expect(billSchema.safeParse(bill).success).toBe(true)
	})

	it("asks for the shared fields and the amount", () => {
		expect(issues({ ...EMPTY_EXPENSE_FORM, type: "recurring" })).toMatchObject({
			description: "Enter a description.",
			categoryId: "Choose a category.",
			paymentTypeId: "Choose a payment type.",
			amount: "Enter an amount above 0, up to 2 decimals."
		})
	})

	it("requires a bank when the payment type has a statement", () => {
		expect(issues({ ...bill, bankId: "" })).toEqual({
			bankId: "Bank is required for this payment type."
		})
	})

	it("ignores a purchase date left over from another type, and the plan fields", () => {
		expect(
			issues({ ...bill, purchasedAt: "2026-12-31", installmentCount: "1" })
		).toEqual({})
	})

	it("builds the bill without a purchase date", () => {
		expect(
			buildCreateExpenseInput({ ...bill, purchasedAt: "2026-11-04" }, "p1")
		).toEqual({
			type: "recurring",
			budgetPeriodId: "p1",
			categoryId: "c1",
			paymentTypeId: "card",
			bankId: "b1",
			storeId: "s1",
			description: "Groceries",
			amount: 25
		})
	})

	it("includes the due and paid dates when set and sends empty lookups as null", () => {
		const input = buildCreateExpenseInput(
			{
				...bill,
				bankId: "",
				storeId: "",
				dueAt: "2026-11-20",
				paidAt: "2026-11-21"
			},
			"p1"
		)
		expect(input).toMatchObject({
			bankId: null,
			storeId: null,
			dueAt: "2026-11-20",
			paidAt: "2026-11-21"
		})
	})

	it("refuses an invalid amount", () => {
		expect(() =>
			buildCreateExpenseInput({ ...bill, amount: "" }, "p1")
		).toThrow()
	})

	it("keeps the recurring type after Finish & add another", () => {
		expect(afterAddAnother(bill)).toMatchObject({
			type: "recurring",
			categoryId: "c1",
			paymentTypeId: "card",
			bankId: "b1",
			amount: "",
			description: ""
		})
	})
})

const saved: Expense = {
	id: "e1",
	budgetPeriodId: "p1",
	recurringExpenseId: null,
	description: "Hydro",
	installmentNumber: null,
	purchasedAt: "2026-11-02T00:00:00.000Z",
	dueAt: "2026-11-12T00:00:00.000Z",
	paidAt: null,
	amount: 1250.5,
	category: { id: "c1", name: "Bills" },
	paymentType: { id: "card", name: "Credit Card" },
	bank: { id: "b1", name: "CIBC" },
	store: { id: "s1", name: "Store" },
	installment: null,
	monthsRunning: null,
	createdAt: "2026-11-01T00:00:00.000Z",
	updatedAt: "2026-11-01T00:00:00.000Z",
	deletedAt: null
}

describe("expenseToFormValues", () => {
	it("fills the form with the row's own values", () => {
		expect(expenseToFormValues(saved)).toEqual({
			...EMPTY_EXPENSE_FORM,
			type: "one-time",
			description: "Hydro",
			categoryId: "c1",
			paymentTypeId: "card",
			bankId: "b1",
			storeId: "s1",
			amount: "1,250.50",
			purchasedAt: "2026-11-02",
			dueAt: "2026-11-12",
			paidAt: ""
		})
	})

	it("leaves a missing bank and store empty", () => {
		const values = expenseToFormValues({ ...saved, bank: null, store: null })
		expect(values.bankId).toBe("")
		expect(values.storeId).toBe("")
	})

	it("takes the type from the row", () => {
		expect(
			expenseToFormValues({ ...saved, recurringExpenseId: "r1" }).type
		).toBe("recurring")
		expect(
			expenseToFormValues({
				...saved,
				installment: {
					id: "g1",
					totalInstallments: 3,
					paymentIntervalDays: 30,
					firstPurchasedAt: "2026-10-01"
				}
			}).type
		).toBe("installment")
	})

	it("round-trips an amount with floating point noise", () => {
		expect(expenseToFormValues({ ...saved, amount: 0.07 }).amount).toBe("0.07")
	})
})

describe("buildUpdateExpenseInput", () => {
	const same = expenseToFormValues(saved)

	it("sends nothing when nothing changed", () => {
		expect(buildUpdateExpenseInput(same, saved)).toBeNull()
	})

	it("sends only the changed fields", () => {
		expect(
			buildUpdateExpenseInput(
				{ ...same, description: " Electricity ", amount: "1,300.00" },
				saved
			)
		).toEqual({ description: "Electricity", amount: 1300 })
	})

	it("sends cleared optional fields as null", () => {
		expect(
			buildUpdateExpenseInput(
				{ ...same, bankId: "", storeId: "", purchasedAt: "", dueAt: "" },
				saved
			)
		).toEqual({ bankId: null, storeId: null, purchasedAt: null, dueAt: null })
	})

	it("sends lookups and dates that changed", () => {
		expect(
			buildUpdateExpenseInput(
				{
					...same,
					categoryId: "c2",
					paymentTypeId: "cash",
					bankId: "b2",
					storeId: "s2",
					paidAt: "2026-11-14"
				},
				saved
			)
		).toEqual({
			categoryId: "c2",
			paymentTypeId: "cash",
			bankId: "b2",
			storeId: "s2",
			paidAt: "2026-11-14"
		})
	})

	it("treats a trailing-zero amount as unchanged", () => {
		expect(
			buildUpdateExpenseInput({ ...same, amount: "1250.50" }, saved)
		).toBeNull()
	})

	it("never sends a purchase date for a recurring row", () => {
		const bill = { ...saved, recurringExpenseId: "r1", purchasedAt: null }
		const values = { ...expenseToFormValues(bill), purchasedAt: "2026-11-01" }
		expect(buildUpdateExpenseInput(values, bill)).toBeNull()
	})
})

describe("createExpenseFormSchema when editing", () => {
	const editSchema = createExpenseFormSchema(
		(id) => id === "card",
		"2026-11-15",
		true
	)

	it("ignores the plan fields of an installment row", () => {
		const values = {
			...expenseToFormValues(saved),
			type: "installment" as const
		}
		expect(editSchema.safeParse(values).success).toBe(true)
	})

	it("rejects a future purchase date on an installment row", () => {
		const result = editSchema.safeParse({
			...expenseToFormValues(saved),
			type: "installment",
			purchasedAt: "2026-11-16"
		})
		expect(result.success).toBe(false)
	})
})
