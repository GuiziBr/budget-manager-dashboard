import { expectTypeOf, test } from "vitest"
import type {
	CreateExpenseInput,
	Expense,
	ExpenseListParams,
	ExpensePage,
	ExpenseSortBy,
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
		recurringExpenseId: string | null
		description: string
		installmentNumber: number | null
		purchasedAt: string | null
		dueAt: string | null
		paidAt: string | null
		amount: number
		category: { id: string; name: string }
		paymentType: { id: string; name: string }
		bank: { id: string; name: string } | null
		store: { id: string; name: string } | null
		installment: {
			id: string
			totalInstallments: number
			paymentIntervalDays: number
			firstPurchasedAt: string
		} | null
		monthsRunning: number | null
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

test("Expense responses carry nested lookups, not flat ids", () => {
	expectTypeOf<Expense>().not.toHaveProperty("categoryId")
	expectTypeOf<Expense>().not.toHaveProperty("paymentTypeId")
	expectTypeOf<Expense>().not.toHaveProperty("bankId")
	expectTypeOf<Expense>().not.toHaveProperty("storeId")
	expectTypeOf<Expense>().not.toHaveProperty("installmentGroupId")
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
		bankId: null,
		monthsAlreadyPaid: 10
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
		sortBy?: ExpenseSortBy
		sortOrder?: "asc" | "desc"
	}>()
})

test("ExpenseSortBy lists the keys the API sorts by", () => {
	expectTypeOf<ExpenseSortBy>().toEqualTypeOf<
		| "description"
		| "amount"
		| "purchasedAt"
		| "dueAt"
		| "paidAt"
		| "installmentNumber"
		| "createdAt"
		| "updatedAt"
	>()
	const params: ExpenseListParams = {
		// @ts-expect-error the API can't sort by category yet (BE-4)
		sortBy: "category"
	}
	void params
})

test("ExpensePage is a page of expenses with the month total", () => {
	expectTypeOf<ExpensePage>().toEqualTypeOf<{
		data: Expense[]
		total: number
		totalAmount: number
		page: number
		limit: number
	}>()
})
