import { afterEach, describe, expect, it, vi } from "vitest"
import type { BudgetPeriod } from "@/types/budget-period"
import {
	compareMonth,
	currentMonth,
	findPeriod,
	formatMonth,
	maxMonth,
	monthLabel,
	nextMonth,
	parseMonth,
	prevMonth,
	resolveMonth
} from "./month"

const NOV_2026 = new Date("2026-11-02T12:00:00Z")

// Default-date calls read the system clock, so pin it instead of racing it
const useClock = (iso: string) => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date(iso))
}

afterEach(() => {
	vi.useRealTimers()
})

const period = (year: number, month: number): BudgetPeriod => ({
	id: `${year}-${month}`,
	year,
	month,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	deletedAt: null
})

describe("currentMonth", () => {
	it("reads the month in UTC", () => {
		expect(currentMonth(NOV_2026)).toEqual({ year: 2026, month: 11 })
	})

	it("stays in the old month until UTC midnight", () => {
		expect(currentMonth(new Date("2026-10-31T23:59:59Z"))).toEqual({
			year: 2026,
			month: 10
		})
		expect(currentMonth(new Date("2026-11-01T00:00:00Z"))).toEqual({
			year: 2026,
			month: 11
		})
	})

	it("uses the clock when no date is given", () => {
		useClock("2026-10-31T23:59:59Z")
		expect(currentMonth()).toEqual({ year: 2026, month: 10 })
		vi.setSystemTime(new Date("2026-11-01T00:00:00Z"))
		expect(currentMonth()).toEqual({ year: 2026, month: 11 })
	})
})

describe("parseMonth and formatMonth", () => {
	it("parses YYYY-MM", () => {
		expect(parseMonth("2026-11")).toEqual({ year: 2026, month: 11 })
		expect(parseMonth("2026-01")).toEqual({ year: 2026, month: 1 })
	})

	it.each([
		null,
		undefined,
		"",
		"2026-13",
		"2026-00",
		"2026-1",
		"26-11",
		"2026-11-01",
		"abc"
	])("rejects %j", (value) => {
		expect(parseMonth(value)).toBeNull()
	})

	it("pads the month and round-trips", () => {
		expect(formatMonth({ year: 2026, month: 3 })).toBe("2026-03")
		expect(parseMonth(formatMonth({ year: 2027, month: 12 }))).toEqual({
			year: 2027,
			month: 12
		})
	})
})

describe("resolveMonth", () => {
	it("uses a valid period", () => {
		expect(resolveMonth("2026-03", NOV_2026)).toEqual({ year: 2026, month: 3 })
	})

	it("falls back to the current month when invalid or missing", () => {
		const nov = { year: 2026, month: 11 }
		expect(resolveMonth("2026-13", NOV_2026)).toEqual(nov)
		expect(resolveMonth(null, NOV_2026)).toEqual(nov)
	})

	it("keeps a period outside the backend range", () => {
		expect(resolveMonth("2099-01", NOV_2026)).toEqual({
			year: 2099,
			month: 1
		})
	})

	it("uses the clock when no date is given", () => {
		useClock("2026-10-31T23:59:59Z")
		expect(resolveMonth(null)).toEqual({ year: 2026, month: 10 })
		vi.setSystemTime(new Date("2026-11-01T00:00:00Z"))
		expect(resolveMonth(null)).toEqual({ year: 2026, month: 11 })
	})
})

describe("prevMonth and nextMonth", () => {
	it("steps across year boundaries", () => {
		expect(prevMonth({ year: 2026, month: 1 })).toEqual({
			year: 2025,
			month: 12
		})
		expect(prevMonth({ year: 2026, month: 11 })).toEqual({
			year: 2026,
			month: 10
		})
		expect(nextMonth({ year: 2026, month: 12 }, NOV_2026)).toEqual({
			year: 2027,
			month: 1
		})
		expect(nextMonth({ year: 2026, month: 11 }, NOV_2026)).toEqual({
			year: 2026,
			month: 12
		})
	})

	it("stops at December of next year", () => {
		expect(nextMonth({ year: 2027, month: 11 }, NOV_2026)).toEqual({
			year: 2027,
			month: 12
		})
		expect(nextMonth({ year: 2027, month: 12 }, NOV_2026)).toBeNull()
		expect(nextMonth({ year: 2030, month: 1 }, NOV_2026)).toBeNull()
	})

	it("moves the limit at UTC new year", () => {
		const lastSecond = new Date("2026-12-31T23:59:59Z")
		const newYear = new Date("2027-01-01T00:00:00Z")
		expect(maxMonth(lastSecond)).toEqual({ year: 2027, month: 12 })
		expect(maxMonth(newYear)).toEqual({ year: 2028, month: 12 })
		expect(nextMonth({ year: 2027, month: 12 }, lastSecond)).toBeNull()
		expect(nextMonth({ year: 2027, month: 12 }, newYear)).toEqual({
			year: 2028,
			month: 1
		})
	})

	it("uses the clock when no date is given", () => {
		useClock("2026-12-31T23:59:59Z")
		const dec2027 = { year: 2027, month: 12 }
		expect(maxMonth()).toEqual(dec2027)
		expect(nextMonth(dec2027)).toBeNull()
		vi.setSystemTime(new Date("2027-01-01T00:00:00Z"))
		expect(maxMonth()).toEqual({ year: 2028, month: 12 })
		expect(nextMonth(dec2027)).toEqual({ year: 2028, month: 1 })
	})
})

describe("compareMonth", () => {
	it("tells past, current and future apart", () => {
		expect(compareMonth({ year: 2026, month: 10 }, NOV_2026)).toBe("past")
		expect(compareMonth({ year: 2026, month: 11 }, NOV_2026)).toBe("current")
		expect(compareMonth({ year: 2026, month: 12 }, NOV_2026)).toBe("future")
	})

	it("compares the year first", () => {
		expect(compareMonth({ year: 2025, month: 12 }, NOV_2026)).toBe("past")
		expect(compareMonth({ year: 2027, month: 1 }, NOV_2026)).toBe("future")
		expect(compareMonth({ year: 2025, month: 11 }, NOV_2026)).toBe("past")
	})

	it("flips at UTC midnight at month end", () => {
		const october = { year: 2026, month: 10 }
		expect(compareMonth(october, new Date("2026-10-31T23:59:59Z"))).toBe(
			"current"
		)
		expect(compareMonth(october, new Date("2026-11-01T00:00:00Z"))).toBe("past")
	})

	it("uses the clock when no date is given", () => {
		useClock("2026-10-31T23:59:59Z")
		const october = { year: 2026, month: 10 }
		expect(compareMonth(october)).toBe("current")
		vi.setSystemTime(new Date("2026-11-01T00:00:00Z"))
		expect(compareMonth(october)).toBe("past")
	})
})

describe("monthLabel", () => {
	it("spells the month and year in English", () => {
		expect(monthLabel({ year: 2026, month: 11 })).toBe("November 2026")
		expect(monthLabel({ year: 2027, month: 1 })).toBe("January 2027")
		expect(monthLabel({ year: 2026, month: 12 })).toBe("December 2026")
	})

	it("takes the year from the value, whatever its size", () => {
		expect(monthLabel({ year: 99, month: 1 })).toBe("January 99")
		expect(monthLabel({ year: 1, month: 1 })).toBe("January 1")
		expect(monthLabel({ year: 0, month: 1 })).toBe("January 0")
	})
})

describe("findPeriod", () => {
	const periods = [period(2026, 11), period(2025, 11), period(2026, 3)]

	it("finds a period whatever the order", () => {
		expect(findPeriod(periods, { year: 2026, month: 3 })).toBe(periods[2])
		expect(findPeriod(periods, { year: 2025, month: 11 })).toBe(periods[1])
	})

	it("returns undefined when the month isn't opened", () => {
		expect(findPeriod(periods, { year: 2026, month: 12 })).toBeUndefined()
		expect(findPeriod([], { year: 2026, month: 11 })).toBeUndefined()
	})
})
