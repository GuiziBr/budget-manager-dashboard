import { describe, expect, it } from "vitest"
import {
	formatDayMonth,
	formatFullDate,
	formatMonthYear,
	todayIso
} from "./format-date"

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

describe("formatFullDate", () => {
	it("adds the year, in UTC", () => {
		expect(formatFullDate("2023-11-10")).toBe("10 Nov 2023")
		expect(formatFullDate("2026-12-31T23:30:00Z")).toBe("31 Dec 2026")
	})

	it("returns null for missing or invalid values", () => {
		expect(formatFullDate(null)).toBeNull()
		expect(formatFullDate(undefined)).toBeNull()
		expect(formatFullDate("nope")).toBeNull()
	})
})

describe("formatMonthYear", () => {
	it("formats month and year, in UTC", () => {
		expect(formatMonthYear("2025-11-01")).toBe("Nov 2025")
		expect(formatMonthYear("2025-12-31T23:30:00Z")).toBe("Dec 2025")
	})

	it("returns null for missing or invalid values", () => {
		expect(formatMonthYear(null)).toBeNull()
		expect(formatMonthYear("")).toBeNull()
		expect(formatMonthYear("nope")).toBeNull()
	})
})

describe("todayIso", () => {
	it("returns the UTC day", () => {
		expect(todayIso(new Date("2026-11-02T12:00:00Z"))).toBe("2026-11-02")
	})

	it("stays on the UTC day at the end of the month", () => {
		expect(todayIso(new Date("2026-11-30T23:59:59Z"))).toBe("2026-11-30")
		expect(todayIso(new Date("2026-12-01T00:00:00Z"))).toBe("2026-12-01")
	})
})
