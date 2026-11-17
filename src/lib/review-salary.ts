import { translations } from "@/constants/translations"
import { parseMoney } from "@/lib/money"
import { sortIncomes } from "@/lib/month-incomes"
import { amountToInput } from "@/lib/month-review"
import type { Income } from "@/types"

/** A salary row of the review. The user can edit, remove and add as many as they need. */
export interface SalaryRow {
	/** Local id, also the salary's key. */
	id: string
	/** Empty reads as "Salary". */
	description: string
	/** The amount as typed. An empty amount means the row is left out. */
	amount: string
}

export interface SalaryInput {
	/** The row's id. */
	key: string
	description: string
	amount: number
}

/**
 * The rows the review starts with: last month's salary incomes (other incomes aren't
 * offered), in the income panel's order, with their descriptions and amounts.
 */
export function salaryRowsFromIncomes(incomes: readonly Income[]): SalaryRow[] {
	return sortIncomes(incomes.filter((income) => income.isSalary)).map(
		(income) => ({
			id: `last-${income.id}`,
			description: income.description,
			amount: amountToInput(income.amount)
		})
	)
}

export interface SalaryFormState {
	rows: readonly SalaryRow[]
	/** Keys already saved: they are locked and never sent again. */
	saved: ReadonlySet<string>
}

export interface SalaryEdits {
	/** The salaries to create. */
	wanted: SalaryInput[]
	/** Keys whose amount isn't valid (zero, too many decimals...). */
	invalidKeys: string[]
}

/**
 * What Done should create: each row ("Salary" when it has no description); a row with no
 * amount is left out, and a saved row is never sent again.
 */
export function diffSalaries(state: SalaryFormState): SalaryEdits {
	const wanted: SalaryInput[] = []
	const invalidKeys: string[] = []
	for (const row of state.rows) {
		if (state.saved.has(row.id) || row.amount.trim() === "") continue
		const amount = parseMoney(row.amount)
		if (amount === null) invalidKeys.push(row.id)
		else
			wanted.push({
				key: row.id,
				description: row.description.trim() || translations.month.income.salary,
				amount
			})
	}
	return { wanted, invalidKeys }
}

export interface PendingSalaries {
	/** Still to create. */
	pending: SalaryInput[]
	/** Already in the month (a request that succeeded but whose response was lost). */
	found: SalaryInput[]
}

/**
 * Before a retry: splits the wanted salaries into those the month already has (same
 * description and amount, salary income) and those still missing. Each existing income
 * matches one wanted salary at most, so two identical salaries aren't collapsed.
 */
export function pendingSalaries(
	wanted: readonly SalaryInput[],
	existing: readonly Income[]
): PendingSalaries {
	const available = existing.filter((income) => income.isSalary)
	const pending: SalaryInput[] = []
	const found: SalaryInput[] = []
	for (const salary of wanted) {
		const index = available.findIndex(
			(income) =>
				income.description === salary.description &&
				income.amount === salary.amount
		)
		if (index === -1) {
			pending.push(salary)
		} else {
			available.splice(index, 1)
			found.push(salary)
		}
	}
	return { pending, found }
}
