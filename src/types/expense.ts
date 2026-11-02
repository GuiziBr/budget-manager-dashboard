import type { Id, IsoDate } from "./common"

export interface Expense {
	id: Id
	budgetPeriodId: Id
	categoryId: Id
	paymentTypeId: Id
	bankId: Id | null
	storeId: Id | null
	installmentGroupId: Id | null
	recurringExpenseId: Id | null
	description: string
	installmentNumber: number | null
	purchasedAt: IsoDate | null
	dueAt: IsoDate | null
	paidAt: IsoDate | null
	amount: number
	createdAt: IsoDate
	updatedAt: IsoDate
	deletedAt: null
}

export type ExpenseType = "one-time" | "recurring" | "installment"

interface CreateExpenseBase {
	budgetPeriodId: Id
	categoryId: Id
	paymentTypeId: Id
	bankId?: Id | null
	storeId?: Id | null
	description: string
}

interface CreateSingleExpenseFields {
	amount: number
	purchasedAt?: IsoDate
	dueAt?: IsoDate
	paidAt?: IsoDate
}

export interface CreateOneTimeExpenseInput
	extends CreateExpenseBase,
		CreateSingleExpenseFields {
	type: "one-time"
}

export interface CreateRecurringExpenseInput
	extends CreateExpenseBase,
		CreateSingleExpenseFields {
	type: "recurring"
}

export interface CreateInstallmentExpenseInput extends CreateExpenseBase {
	type: "installment"
	amountPerInstallment: number
	totalInstallments: number
	paymentIntervalDays: number
	firstPurchasedAt: IsoDate
}

export type CreateExpenseInput =
	| CreateOneTimeExpenseInput
	| CreateRecurringExpenseInput
	| CreateInstallmentExpenseInput

export interface UpdateExpenseInput {
	description?: string
	amount?: number
	categoryId?: Id
	paymentTypeId?: Id
	bankId?: Id | null
	storeId?: Id | null
	purchasedAt?: IsoDate | null
	dueAt?: IsoDate | null
	paidAt?: IsoDate | null
}

export interface ExpenseListParams {
	budgetPeriodId?: Id
	page?: number
	limit?: number
}
