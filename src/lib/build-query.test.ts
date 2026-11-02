import { describe, expect, it } from "vitest"
import { buildQuery } from "./build-query"

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

	it("encodes values", () => {
		expect(buildQuery({ q: "a b&c" })).toBe("?q=a+b%26c")
	})
})
