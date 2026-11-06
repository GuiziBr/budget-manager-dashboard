import { describe, expect, it } from "vitest"
import { formatDayMonth } from "./format-date"

describe("formatDayMonth", () => {
	it("formats a date and a timestamp", () => {
		expect(formatDayMonth("2026-11-28")).toBe("28 Nov")
		expect(formatDayMonth("2026-11-01T23:59:59.000Z")).toBe("1 Nov")
	})

	it("reads the day in UTC", () => {
		expect(formatDayMonth("2026-12-31T23:30:00Z")).toBe("31 Dec")
	})

	it("returns null for missing or invalid values", () => {
		expect(formatDayMonth(null)).toBeNull()
		expect(formatDayMonth(undefined)).toBeNull()
		expect(formatDayMonth("")).toBeNull()
		expect(formatDayMonth("not a date")).toBeNull()
	})
})
