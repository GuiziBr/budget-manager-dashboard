import { describe, expect, it } from "vitest"
import type { Income } from "@/types"
import { incomeSummary, sortIncomes } from "./month-incomes"

const income = (over: Partial<Income>): Income => ({
	id: "i",
	budgetPeriodId: "p",
	description: "x",
	amount: 1,
	isSalary: false,
	receivedAt: null,
	createdAt: "2026-11-01T00:00:00.000Z",
	updatedAt: "",
	deletedAt: null,
	...over
})

describe("sortIncomes", () => {
	it("puts salary first, whatever the dates", () => {
		const sorted = sortIncomes([
			income({ id: "gift", receivedAt: "2026-11-01T00:00:00.000Z" }),
			income({
				id: "salary",
				isSalary: true,
				receivedAt: "2026-11-28T00:00:00.000Z"
			})
		])
		expect(sorted.map((i) => i.id)).toEqual(["salary", "gift"])
	})

	it("orders each group by received date, undated last", () => {
		const sorted = sortIncomes([
			income({ id: "undated" }),
			income({ id: "late", receivedAt: "2026-11-20T00:00:00.000Z" }),
			income({ id: "early", receivedAt: "2026-11-02T00:00:00.000Z" }),
			income({
				id: "salary-2",
				isSalary: true,
				receivedAt: "2026-11-15T00:00:00.000Z"
			}),
			income({
				id: "salary-1",
				isSalary: true,
				receivedAt: "2026-11-01T00:00:00.000Z"
			})
		])
		expect(sorted.map((i) => i.id)).toEqual([
			"salary-1",
			"salary-2",
			"early",
			"late",
			"undated"
		])
	})

	it("falls back to creation order and leaves the input alone", () => {
		const input = [
			income({ id: "b", createdAt: "2026-11-03T00:00:00.000Z" }),
			income({ id: "a", createdAt: "2026-11-02T00:00:00.000Z" })
		]
		expect(sortIncomes(input).map((i) => i.id)).toEqual(["a", "b"])
		expect(input.map((i) => i.id)).toEqual(["b", "a"])
	})
})

describe("incomeSummary", () => {
	it("reads 6,144.00 of salary from two salaries", () => {
		expect(
			incomeSummary([
				income({ amount: 3000, isSalary: true }),
				income({ amount: 3144, isSalary: true }),
				income({ amount: 100 })
			])
		).toEqual({ total: 6244, salary: 6144 })
	})

	it("has no salary when none is flagged", () => {
		expect(incomeSummary([income({ amount: 50 })])).toEqual({
			total: 50,
			salary: 0
		})
		expect(incomeSummary([])).toEqual({ total: 0, salary: 0 })
	})
})
