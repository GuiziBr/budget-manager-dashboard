import { describe, expect, it } from "vitest"
import {
	monthChangeHref,
	parseSelection,
	selectionHref
} from "./selection-link"

const params = (search: string) => new URLSearchParams(search)

describe("parseSelection", () => {
	it("reads an expense and an envelope", () => {
		expect(parseSelection(params("expense=e1"))).toEqual({
			kind: "expense",
			id: "e1"
		})
		expect(parseSelection(params("envelope=v1"))).toEqual({
			kind: "envelope",
			id: "v1"
		})
	})

	it("prefers the expense when both are given", () => {
		expect(parseSelection(params("envelope=v1&expense=e1"))).toEqual({
			kind: "expense",
			id: "e1"
		})
	})

	it("treats a missing or blank value as nothing", () => {
		expect(parseSelection(params(""))).toBeNull()
		expect(parseSelection(params("expense=&envelope=%20"))).toBeNull()
	})
})

describe("selectionHref", () => {
	it("adds the selection and keeps period, page and sort", () => {
		expect(
			selectionHref(
				params("period=2026-11&page=3&sortBy=amount&sortOrder=asc"),
				{
					kind: "expense",
					id: "e1"
				}
			)
		).toBe("?period=2026-11&page=3&sortBy=amount&sortOrder=asc&expense=e1")
	})

	it("replaces the other kind of selection", () => {
		expect(
			selectionHref(params("period=2026-11&expense=e1"), {
				kind: "envelope",
				id: "v1"
			})
		).toBe("?period=2026-11&envelope=v1")
	})

	it("can move to another page in the same step", () => {
		expect(
			selectionHref(
				params("period=2026-11&page=2&sortBy=amount&expense=e1"),
				{ kind: "expense", id: "e2" },
				{ page: 3 }
			)
		).toBe("?period=2026-11&page=3&sortBy=amount&expense=e2")
	})

	it("leaves the address clean when moving to page 1", () => {
		expect(
			selectionHref(
				params("period=2026-11&page=2&expense=e1"),
				{ kind: "expense", id: "e2" },
				{ page: 1 }
			)
		).toBe("?period=2026-11&expense=e2")
	})

	it("removes the selection and nothing else", () => {
		expect(
			selectionHref(params("period=2026-11&page=2&expense=e1"), null)
		).toBe("?period=2026-11&page=2")
		expect(selectionHref(params("envelope=v1"), null)).toBe("?")
	})
})

describe("monthChangeHref", () => {
	it("sets the month, drops the page and keeps the selection and sort", () => {
		expect(
			monthChangeHref(
				params("period=2026-10&page=4&sortBy=dueAt&sortOrder=desc&expense=e1"),
				{ year: 2026, month: 11 }
			)
		).toBe("?period=2026-11&sortBy=dueAt&sortOrder=desc&expense=e1")
	})

	it("adds the period when the address had none", () => {
		expect(
			monthChangeHref(params("envelope=v1"), { year: 2027, month: 1 })
		).toBe("?envelope=v1&period=2027-01")
	})
})
