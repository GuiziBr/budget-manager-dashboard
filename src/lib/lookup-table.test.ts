import { describe, expect, it } from "vitest"
import type { LookupItem } from "./lookup-form"
import {
	changedAt,
	DEFAULT_LOOKUP_SORT,
	LOOKUP_PAGE_SIZE,
	lookupFlag,
	nextLookupSort,
	pageOf,
	sortLookupRows
} from "./lookup-table"

const item = (name: string, extra: object = {}) =>
	({
		id: name,
		name,
		createdAt: "2022-07-06T00:00:00.000Z",
		updatedAt: "2022-07-06T00:00:00.000Z",
		...extra
	}) as LookupItem

const names = (items: LookupItem[]) => items.map((i) => i.name)

describe("lookupFlag", () => {
	it("reads the flag of categories and payment types, none for the rest", () => {
		expect(lookupFlag(item("a", { hasBudgetEnvelope: true }))).toBe(true)
		expect(lookupFlag(item("a", { hasStatement: true }))).toBe(true)
		expect(lookupFlag(item("a", { hasStatement: false }))).toBe(false)
		expect(lookupFlag(item("a"))).toBe(false)
	})
})

describe("changedAt", () => {
	it("is null when never updated and the date otherwise", () => {
		expect(changedAt(item("a"))).toBeNull()
		expect(
			changedAt(item("a", { updatedAt: "2026-03-05T00:00:00.000Z" }))
		).toBe("2026-03-05T00:00:00.000Z")
		expect(changedAt(item("a", { updatedAt: null }))).toBeNull()
	})
})

describe("sortLookupRows", () => {
	const list = [item("transport"), item("Grocery"), item("Hydro")]

	it("sorts by name ignoring case, both ways, without mutating", () => {
		expect(names(sortLookupRows(list, DEFAULT_LOOKUP_SORT))).toEqual([
			"Grocery",
			"Hydro",
			"transport"
		])
		expect(
			names(sortLookupRows(list, { column: "name", direction: "desc" }))
		).toEqual(["transport", "Hydro", "Grocery"])
		expect(names(list)).toEqual(["transport", "Grocery", "Hydro"])
	})

	it("sorts by flag, then name", () => {
		const flagged = [
			item("B", { hasStatement: true }),
			item("A", { hasStatement: false }),
			item("C", { hasStatement: true })
		]
		expect(
			names(sortLookupRows(flagged, { column: "flag", direction: "asc" }))
		).toEqual(["A", "B", "C"])
		expect(
			names(sortLookupRows(flagged, { column: "flag", direction: "desc" }))
		).toEqual(["B", "C", "A"])
	})

	it("sorts by creation date, then name", () => {
		const dated = [
			item("B", { createdAt: "2023-01-01T00:00:00.000Z" }),
			item("C"),
			item("A")
		]
		expect(
			names(sortLookupRows(dated, { column: "createdAt", direction: "asc" }))
		).toEqual(["A", "C", "B"])
		expect(
			names(sortLookupRows(dated, { column: "createdAt", direction: "desc" }))
		).toEqual(["B", "A", "C"])
	})
})

describe("nextLookupSort", () => {
	it("starts ascending and flips on the same column", () => {
		const byFlag = nextLookupSort(DEFAULT_LOOKUP_SORT, "flag")
		expect(byFlag).toEqual({ column: "flag", direction: "asc" })
		expect(nextLookupSort(byFlag, "flag").direction).toBe("desc")
		expect(
			nextLookupSort({ column: "flag", direction: "desc" }, "flag").direction
		).toBe("asc")
		expect(nextLookupSort(byFlag, "name")).toEqual(DEFAULT_LOOKUP_SORT)
	})
})

describe("pageOf", () => {
	const rows = Array.from({ length: 19 }, (_, i) => i + 1)

	it("uses 8 rows per page", () => {
		expect(LOOKUP_PAGE_SIZE).toBe(8)
		const first = pageOf(rows, 1)
		expect(first.rows).toHaveLength(8)
		expect(first.pages).toEqual([1, 2, 3])
		expect([first.from, first.to, first.total]).toEqual([1, 8, 19])
	})

	it("gives the short last page", () => {
		const last = pageOf(rows, 3)
		expect(last.rows).toEqual([17, 18, 19])
		expect([last.from, last.to]).toEqual([17, 19])
	})

	it("keeps the page inside the list", () => {
		expect(pageOf(rows, 9).page).toBe(3)
		expect(pageOf(rows, 0).page).toBe(1)
	})

	it("handles an empty list", () => {
		const empty = pageOf([], 1)
		expect(empty).toMatchObject({ rows: [], page: 1, from: 0, to: 0, total: 0 })
		expect(empty.pages).toEqual([1])
	})
})
