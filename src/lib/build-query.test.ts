import { describe, expect, it } from "vitest"
import { buildQuery, withQuery } from "./build-query"

describe("buildQuery", () => {
	it("returns an empty string without params", () => {
		expect(buildQuery({})).toBe("")
	})

	it("builds a query string in insertion order", () => {
		expect(buildQuery({ page: 2, limit: 20, sortBy: "dueAt" })).toBe(
			"?page=2&limit=20&sortBy=dueAt"
		)
	})

	it("skips undefined, null and empty values", () => {
		expect(buildQuery({ a: undefined, b: null, c: "", d: "x" })).toBe("?d=x")
	})

	it("returns an empty string when every value is skipped", () => {
		expect(buildQuery({ a: undefined, b: null })).toBe("")
	})

	it("keeps zero", () => {
		expect(buildQuery({ offset: 0 })).toBe("?offset=0")
	})

	it("rejects unsupported values", () => {
		// @ts-expect-error arrays are not a supported value
		buildQuery({ ids: ["a"] })
	})

	it("encodes values", () => {
		expect(buildQuery({ q: "a b&c" })).toBe("?q=a+b%26c")
	})
})

describe("withQuery", () => {
	it("appends to an endpoint without a query", () => {
		expect(withQuery("expenses", { page: 2 })).toBe("expenses?page=2")
	})

	it("keeps the existing query", () => {
		expect(withQuery("expenses?budgetPeriodId=p1", { page: 2 })).toBe(
			"expenses?budgetPeriodId=p1&page=2"
		)
	})

	it("replaces an existing param of the same name", () => {
		expect(withQuery("expenses?page=1", { page: 2 })).toBe("expenses?page=2")
	})

	it("returns the endpoint unchanged when every param is skipped", () => {
		expect(withQuery("expenses?a=1", { b: undefined })).toBe("expenses?a=1")
		expect(withQuery("expenses", {})).toBe("expenses")
	})
})
