import { formatMoneyInput, parseMoney } from "@/lib/money"
import type { Expense, Id } from "@/types"

export interface ReviewExpenses {
	/** Recurring bills generated for the month. */
	bills: Expense[]
	/** Installment payments due in the month. */
	installments: Expense[]
}

const byDescription = (a: Expense, b: Expense) =>
	a.description.localeCompare(b.description)

/**
 * Splits a freshly opened month's expenses into what the review shows (M-02): the
 * recurring bills and the installment payments, each A to Z. Anything else (a
 * one-time expense) isn't part of the generated content and is left out.
 */
export function splitReviewExpenses(
	expenses: readonly Expense[]
): ReviewExpenses {
	const bills: Expense[] = []
	const installments: Expense[] = []
	for (const expense of expenses) {
		if (expense.installment !== null) installments.push(expense)
		else if (expense.recurringExpenseId !== null) bills.push(expense)
	}
	return {
		bills: bills.sort(byDescription),
		installments: installments.sort(byDescription)
	}
}

/** The final payment of a plan carries the "Last payment" tag. */
export function isLastPayment(expense: Expense): boolean {
	return (
		expense.installment !== null &&
		expense.installmentNumber === expense.installment.totalInstallments
	)
}

/** An amount as the field shows it: `105` reads `105.00`. */
export function amountToInput(amount: number): string {
	return formatMoneyInput(amount.toFixed(2))
}

export interface BillChange {
	id: Id
	amount: number
}

export interface BillEdits {
	/** Amounts to send: the rows whose typed amount differs from the loaded one. */
	changes: BillChange[]
	/** Rows whose typed amount isn't a valid amount (empty, zero, too many decimals). */
	invalidIds: Id[]
}

/**
 * Compares what was typed in the bills' fields with what is saved. `edits` holds only
 * the fields that were touched, keyed by expense id; a bill without an entry is unchanged.
 */
export function diffBillAmounts(
	bills: readonly Expense[],
	edits: Readonly<Record<Id, string>>
): BillEdits {
	const changes: BillChange[] = []
	const invalidIds: Id[] = []
	for (const bill of bills) {
		const text = edits[bill.id]
		if (text === undefined) continue
		const amount = parseMoney(text)
		if (amount === null) invalidIds.push(bill.id)
		else if (amount !== bill.amount) changes.push({ id: bill.id, amount })
	}
	return { changes, invalidIds }
}
