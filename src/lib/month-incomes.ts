import { totals } from "@/lib/month-rows"
import type { Income } from "@/types"

const time = (value: string | null) => {
	const parsed = value ? Date.parse(value) : Number.NaN
	return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed
}

/**
 * The order of the income panel: salary first, then by received date (earliest
 * first, undated last), then by creation. The API gives no order of its own.
 */
export function sortIncomes(incomes: readonly Income[]): Income[] {
	return [...incomes].sort(
		(a, b) =>
			Number(b.isSalary) - Number(a.isSalary) ||
			time(a.receivedAt) - time(b.receivedAt) ||
			time(a.createdAt) - time(b.createdAt)
	)
}

/** The month's total income and how much of it is salary. */
export function incomeSummary(incomes: readonly Income[]) {
	const { income, salaryBase } = totals({
		expenseTotal: 0,
		envelopes: [],
		incomes: [...incomes]
	})
	return { total: income, salary: salaryBase }
}
