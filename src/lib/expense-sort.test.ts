import { describe, expect, it } from "vitest"
import { withQuery } from "./build-query"
import {
	DEFAULT_SORT_PARAMS,
	nextSort,
	parseSort,
	type SortColumn,
	type SortState,
	sortIndicator,
	toSortParams,
	toSortSearch
} from "./expense-sort"

const KEYS = [
	["item", "description"],
	["category", "categoryName"],
	["payment", "paymentTypeName"],
	["due", "dueAt"],
	["paid", "paidAt"],
	["amount", "amount"]
] as const

describe("toSortParams", () => {
	it.each(KEYS)("maps %s to %s", (column, sortBy) => {
		expect(toSortParams({ column, order: "asc" })).toEqual({
			sortBy,
			sortOrder: "asc"
		})
		expect(toSortParams({ column, order: "desc" })).toEqual({
			sortBy,
			sortOrder: "desc"
		})
	})

	it("returns newest first for the default order", () => {
		expect(toSortParams(null)).toEqual({
			sortBy: "createdAt",
			sortOrder: "desc"
		})
		expect(DEFAULT_SORT_PARAMS).toEqual(toSortParams(null))
	})
})

describe("nextSort", () => {
	it("starts a column ascending", () => {
		expect(nextSort(null, "due")).toEqual({ column: "due", order: "asc" })
	})

	it("goes descending on the second click", () => {
		expect(nextSort({ column: "due", order: "asc" }, "due")).toEqual({
			column: "due",
			order: "desc"
		})
	})

	it("returns to the default on the third click", () => {
		expect(nextSort({ column: "due", order: "desc" }, "due")).toBeNull()
	})

	it("starts another column ascending, from either direction", () => {
		expect(nextSort({ column: "due", order: "desc" }, "amount")).toEqual({
			column: "amount",
			order: "asc"
		})
		expect(nextSort({ column: "due", order: "asc" }, "paid")).toEqual({
			column: "paid",
			order: "asc"
		})
	})

	it.each(KEYS)("cycles %s through asc, desc and default", (column) => {
		const first = nextSort(null, column)
		const second = nextSort(first, column)
		expect(first).toEqual({ column, order: "asc" })
		expect(second).toEqual({ column, order: "desc" })
		expect(nextSort(second, column)).toBeNull()
	})

	it("doesn't mutate the state", () => {
		const state: SortState = { column: "due", order: "asc" }
		nextSort(state, "due")
		expect(state).toEqual({ column: "due", order: "asc" })
	})
})

describe("sortIndicator", () => {
	it("shows the direction on the active column only", () => {
		const asc: SortState = { column: "due", order: "asc" }
		const desc: SortState = { column: "due", order: "desc" }
		expect(sortIndicator(asc, "due")).toBe("↑")
		expect(sortIndicator(desc, "due")).toBe("↓")
		expect(sortIndicator(asc, "amount")).toBe("")
	})

	it("shows nothing at the default order", () => {
		expect(sortIndicator(null, "due")).toBe("")
	})
})

describe("parseSort", () => {
	it("round-trips every column and direction", () => {
		for (const [column] of KEYS) {
			for (const order of ["asc", "desc"] as const) {
				const state: SortState = { column: column as SortColumn, order }
				const { sortBy, sortOrder } = toSortParams(state)
				expect(parseSort(sortBy, sortOrder)).toEqual(state)
			}
		}
	})

	it.each([
		["an unknown key", "category", "asc"],
		["the default key", "createdAt", "asc"],
		["an invalid order", "dueAt", "up"],
		["a missing order", "dueAt", null],
		["a missing key", null, "asc"],
		["undefined values", undefined, undefined],
		["empty values", "", ""]
	])("returns null for %s", (_, sortBy, sortOrder) => {
		expect(parseSort(sortBy, sortOrder)).toBeNull()
	})
})

describe("toSortSearch", () => {
	it("returns the two params for a sort", () => {
		const search = toSortSearch({ column: "due", order: "desc" })
		expect(search).toEqual({ sortBy: "dueAt", sortOrder: "desc" })
		expect(withQuery("month", search)).toBe("month?sortBy=dueAt&sortOrder=desc")
	})

	it("returns nothing at the default order", () => {
		expect(toSortSearch(null)).toEqual({})
		expect(withQuery("month", toSortSearch(null))).toBe("month")
	})
})
