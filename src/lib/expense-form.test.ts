import { describe, expect, it } from "vitest"
import {
	afterAddAnother,
	buildCreateExpenseInput,
	createExpenseFormSchema,
	EMPTY_EXPENSE_FORM,
	type ExpenseFormValues
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
