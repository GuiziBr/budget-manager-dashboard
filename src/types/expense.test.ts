import { expectTypeOf, test } from "vitest"
import type {
	CreateExpenseInput,
	Expense,
	ExpenseListParams,
	UpdateExpenseInput
} from "./expense"

const base = {
	budgetPeriodId: "p",
	categoryId: "c",
	paymentTypeId: "t",
	description: "d"
}

test("Expense matches the API resource", () => {
	expectTypeOf<Expense>().toEqualTypeOf<{
		id: string
		budgetPeriodId: string
		categoryId: string
		paymentTypeId: string
		bankId: string | null
		storeId: string | null
		installmentGroupId: string | null
		recurringExpenseId: string | null
		description: string
		installmentNumber: number | null
		purchasedAt: string | null
		dueAt: string | null
		paidAt: string | null
		amount: number
		createdAt: string
		updatedAt: string
		deletedAt: null
	}>()
})

test("Expense carries no fields the API lacks", () => {
	expectTypeOf<Expense>().not.toHaveProperty("type")
	expectTypeOf<Expense>().not.toHaveProperty("totalInstallments")
	expectTypeOf<Expense>().not.toHaveProperty("categoryName")
})

test("CreateExpenseInput narrows on type", () => {
	const installment = {
		...base,
		type: "installment",
		amountPerInstallment: 50,
		totalInstallments: 12,
		paymentIntervalDays: 30,
		firstPurchasedAt: "2026-11-15"
	} satisfies CreateExpenseInput
	expectTypeOf(installment.type).toEqualTypeOf<"installment">()

	const oneTime: CreateExpenseInput = {
		...base,
		type: "one-time",
		amount: 25
	}
	if (oneTime.type === "one-time") {
		expectTypeOf(oneTime.amount).toEqualTypeOf<number>()
	}

	const recurring: CreateExpenseInput = {
		...base,
		type: "recurring",
		amount: 25,
		bankId: null
	}
	expectTypeOf(recurring).toExtend<CreateExpenseInput>()
})

test("CreateExpenseInput rejects invalid combinations", () => {
	// @ts-expect-error installment needs firstPurchasedAt
	const missing: CreateExpenseInput = {
		...base,
		type: "installment",
		amountPerInstallment: 50,
		totalInstallments: 12,
		paymentIntervalDays: 30
	}
	const extra: CreateExpenseInput = {
		...base,
		type: "one-time",
		amount: 25,
		// @ts-expect-error one-time has no totalInstallments
		totalInstallments: 3
	}
	// @ts-expect-error unknown type
	const unknown: CreateExpenseInput = { ...base, type: "other", amount: 1 }
	void [missing, extra, unknown]
})

test("UpdateExpenseInput is partial and can clear nullable fields", () => {
	const clear: UpdateExpenseInput = { paidAt: null, bankId: null }
	expectTypeOf(clear).toExtend<UpdateExpenseInput>()
	expectTypeOf<UpdateExpenseInput>().not.toHaveProperty("budgetPeriodId")
	expectTypeOf<UpdateExpenseInput>().not.toHaveProperty("type")
	// @ts-expect-error budgetPeriodId can't change
	const moved: UpdateExpenseInput = { budgetPeriodId: "p" }
	void moved
})

test("ExpenseListParams are all optional", () => {
	expectTypeOf<ExpenseListParams>().toEqualTypeOf<{
		budgetPeriodId?: string
		page?: number
		limit?: number
	}>()
})
