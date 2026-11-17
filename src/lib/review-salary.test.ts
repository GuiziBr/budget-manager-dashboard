import { describe, expect, it } from "vitest"
import type { Income } from "@/types"
import {
	diffSalaries,
	pendingSalaries,
	type SalaryFormState,
	salaryRowsFromIncomes
} from "./review-salary"

function income(id: string, overrides: Partial<Income> = {}): Income {
	return {
		id,
		budgetPeriodId: "p1",
		description: id,
		amount: 1000,
		isSalary: true,
		receivedAt: null,
		createdAt: "2026-11-01T00:00:00Z",
		updatedAt: "",
		deletedAt: null,
		...overrides
	}
}

function state(overrides: Partial<SalaryFormState> = {}): SalaryFormState {
	return { rows: [], saved: new Set(), ...overrides }
}

describe("salaryRowsFromIncomes", () => {
	it("starts from last month's salary incomes only, in the panel's order", () => {
		const rows = salaryRowsFromIncomes([
			income("Bonus", { isSalary: false }),
			income("B", { receivedAt: "2026-11-15", amount: 500.5 }),
			income("A", { receivedAt: "2026-11-01", amount: 3000 })
		])
		expect(rows).toEqual([
			{ id: "last-A", description: "A", amount: "3,000.00" },
			{ id: "last-B", description: "B", amount: "500.50" }
		])
	})

	it("gives no rows when there is no salary", () => {
		expect(salaryRowsFromIncomes([])).toEqual([])
	})
})

describe("diffSalaries", () => {
	const row = (id: string, amount: string, description = "") => ({
		id,
		description,
		amount
	})

	it("creates each row, named Salary when it has no description", () => {
		const { wanted, invalidKeys } = diffSalaries(
			state({
				rows: [row("n1", "6,144.00"), row("n2", "500.50", " Side job ")]
			})
		)
		expect(wanted).toEqual([
			{ key: "n1", description: "Salary", amount: 6144 },
			{ key: "n2", description: "Side job", amount: 500.5 }
		])
		expect(invalidKeys).toEqual([])
	})

	it("leaves out empty and saved rows, flags malformed ones", () => {
		expect(diffSalaries(state()).wanted).toEqual([])
		const result = diffSalaries(
			state({
				rows: [row("n1", ""), row("n2", "10.00"), row("n3", "0.00")],
				saved: new Set(["n2"])
			})
		)
		expect(result.wanted).toEqual([])
		expect(result.invalidKeys).toEqual(["n3"])
	})
})

describe("pendingSalaries", () => {
	const wanted = [
		{ key: "a", description: "Salary", amount: 1000 },
		{ key: "b", description: "Salary", amount: 1000 }
	]

	it("keeps everything pending when the month has no matching salary", () => {
		const result = pendingSalaries(wanted, [
			income("x", { description: "Salary", amount: 999 }),
			income("y", { description: "Salary", amount: 1000, isSalary: false })
		])
		expect(result.pending).toEqual(wanted)
		expect(result.found).toEqual([])
	})

	it("matches each existing income to one wanted salary only", () => {
		const result = pendingSalaries(wanted, [
			income("x", { description: "Salary", amount: 1000 })
		])
		expect(result.found.map((s) => s.key)).toEqual(["a"])
		expect(result.pending.map((s) => s.key)).toEqual(["b"])
	})

	it("finds all of them when all were saved", () => {
		const result = pendingSalaries(wanted, [
			income("x", { description: "Salary", amount: 1000 }),
			income("y", { description: "Salary", amount: 1000 })
		])
		expect(result.pending).toEqual([])
		expect(result.found).toHaveLength(2)
	})
})
