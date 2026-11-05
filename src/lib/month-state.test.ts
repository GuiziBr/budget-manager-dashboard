import { describe, expect, it } from "vitest"
import { canEditMonth, getMonthState } from "./month-state"

const period = {
	id: "p1",
	year: 2026,
	month: 11,
	createdAt: "",
	updatedAt: "",
	deletedAt: null
} as const

const base = { isLoading: false, error: null, period: undefined }

describe("getMonthState", () => {
	it("is loading while the periods load", () => {
		expect(
			getMonthState({ ...base, isLoading: true, comparison: "current" })
		).toBe("loading")
	})

	it("is error when the request failed", () => {
		expect(
			getMonthState({ ...base, error: new Error("x"), comparison: "current" })
		).toBe("error")
	})

	it("is not-opened for current and future months without a period", () => {
		expect(getMonthState({ ...base, comparison: "current" })).toBe("not-opened")
		expect(getMonthState({ ...base, comparison: "future" })).toBe("not-opened")
	})

	it("is not-tracked for a past month without a period", () => {
		expect(getMonthState({ ...base, comparison: "past" })).toBe("not-tracked")
	})

	it("is closed for an opened past month", () => {
		expect(getMonthState({ ...base, period, comparison: "past" })).toBe(
			"closed"
		)
	})

	it("is open for an opened current or future month", () => {
		expect(getMonthState({ ...base, period, comparison: "current" })).toBe(
			"open"
		)
		expect(getMonthState({ ...base, period, comparison: "future" })).toBe(
			"open"
		)
	})
})

describe("canEditMonth", () => {
	it("allows actions only in the open state", () => {
		expect(canEditMonth("open")).toBe(true)
		for (const state of [
			"loading",
			"error",
			"not-opened",
			"not-tracked",
			"closed"
		] as const)
			expect(canEditMonth(state)).toBe(false)
	})
})
