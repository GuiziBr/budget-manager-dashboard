import type { BudgetEnvelope, Expense, Id, Income, IsoDate } from "@/types"

export type RowType = "one-time" | "installment" | "recurring"

export interface RowInstallment {
	// Null only if the API sends an installment expense without its number
	number: number | null
	total: number
	paymentIntervalDays: number
	firstPurchasedAt: IsoDate
}

export interface MonthRow {
	expense: Expense
	type: RowType
	category: string
	paymentType: string
	bank: string | null
	store: string | null
	installment: RowInstallment | null
	monthsRunning: number | null
	unpaid: boolean
	overdue: boolean
}

export interface InstallmentPlanDates {
	firstPurchasedAt: IsoDate
	totalInstallments: number
	paymentIntervalDays: number
}

export interface EnvelopeStatus {
	envelope: BudgetEnvelope
	// Null when the category isn't in the lookup (deleted since)
	categoryName: string | null
	allocated: number
	// Null when the spend service couldn't answer
	spent: number | null
	ratio: number | null
	overBudget: boolean
}

export interface MonthTotals {
	income: number
	expenses: number
	balance: number
	salaryBase: number
	// False when some envelope has no spend figure, so expenses is incomplete
	spendComplete: boolean
}

export interface MonthTotalsInput {
	// `totalAmount` of GET /expenses: every page, not only the one on screen
	expenseTotal: number
	envelopes: readonly BudgetEnvelope[]
	incomes: readonly Income[]
}

// Money is summed in cents so 7375.67 - 6530.48 is 845.19, not 845.1899999
const toCents = (value: number) => Math.round(value * 100)
const fromCents = (cents: number) => cents / 100

const toUtcDay = (iso: IsoDate) => iso.slice(0, 10)

export function rowType(expense: Expense): RowType {
	if (expense.installment !== null) return "installment"
	if (expense.recurringExpenseId !== null) return "recurring"
	return "one-time"
}

export function isUnpaid(expense: Expense): boolean {
	return expense.paidAt === null
}

// Overdue = unpaid and due before today (UTC), in any month. Due today is not overdue
export function isOverdue(expense: Expense, now: Date): boolean {
	if (!isUnpaid(expense) || expense.dueAt === null) return false
	return toUtcDay(expense.dueAt) < toUtcDay(now.toISOString())
}

// Keeps the API's order: sorting a single page in the browser is never done
export function buildRows(expenses: readonly Expense[], now: Date): MonthRow[] {
	return expenses.map((expense) => ({
		expense,
		type: rowType(expense),
		category: expense.category.name,
		paymentType: expense.paymentType.name,
		bank: expense.bank?.name ?? null,
		store: expense.store?.name ?? null,
		installment: expense.installment && {
			number: expense.installmentNumber,
			total: expense.installment.totalInstallments,
			paymentIntervalDays: expense.installment.paymentIntervalDays,
			firstPurchasedAt: expense.installment.firstPurchasedAt
		},
		monthsRunning: expense.monthsRunning,
		unpaid: isUnpaid(expense),
		overdue: isOverdue(expense, now)
	}))
}

// First purchase + (N - 1) x interval days, in UTC, as YYYY-MM-DD
export function installmentEndDate(plan: InstallmentPlanDates): string {
	const end = new Date(plan.firstPurchasedAt)
	end.setUTCDate(
		end.getUTCDate() + (plan.totalInstallments - 1) * plan.paymentIntervalDays
	)
	return toUtcDay(end.toISOString())
}

// The end date of the plan a row belongs to, from what the row already carries
export function rowInstallmentEndDate(installment: RowInstallment): string {
	return installmentEndDate({
		firstPurchasedAt: installment.firstPurchasedAt,
		totalInstallments: installment.total,
		paymentIntervalDays: installment.paymentIntervalDays
	})
}

// Allocated minus spent, in cents so it stays exact. Negative when over budget; null without a spend figure
export function envelopeRemaining(status: EnvelopeStatus): number | null {
	if (status.spent === null) return null
	return fromCents(toCents(status.allocated) - toCents(status.spent))
}

export function envelopeStatus(
	envelope: BudgetEnvelope,
	categoryNames: ReadonlyMap<Id, string>
): EnvelopeStatus {
	const allocated = envelope.allocatedAmount
	const spent = envelope.spentAmount
	return {
		envelope,
		categoryName: categoryNames.get(envelope.categoryId) ?? null,
		allocated,
		spent,
		ratio: spent === null || allocated === 0 ? null : spent / allocated,
		overBudget: spent !== null && spent > allocated
	}
}

// Over-budget envelopes first, the rest in the order given
export function sortEnvelopes(
	statuses: readonly EnvelopeStatus[]
): EnvelopeStatus[] {
	return [...statuses].sort(
		(a, b) => Number(b.overBudget) - Number(a.overBudget)
	)
}

export function totals({
	expenseTotal,
	envelopes,
	incomes
}: MonthTotalsInput): MonthTotals {
	const income = incomes.reduce((sum, i) => sum + toCents(i.amount), 0)
	const salaryBase = incomes
		.filter((i) => i.isSalary)
		.reduce((sum, i) => sum + toCents(i.amount), 0)
	const spend = envelopes.reduce(
		(sum, e) => sum + toCents(e.spentAmount ?? 0),
		0
	)
	const expenses = toCents(expenseTotal) + spend
	return {
		income: fromCents(income),
		expenses: fromCents(expenses),
		balance: fromCents(income - expenses),
		salaryBase: fromCents(salaryBase),
		spendComplete: envelopes.every((e) => e.spentAmount !== null)
	}
}
