import { describe, expect, it } from "vitest"
import {
	planChangeApplies,
	planChangeMessage,
	planDueDates,
	planPlacement,
	planSummary,
	planToast
} from "./installment-plan"
import { installmentEndDate } from "./month-rows"

const nov = { year: 2026, month: 11 }
const periods = (...months: number[]) =>
	months.map((month) => ({ year: 2026, month }))

describe("planDueDates", () => {
	it("adds the interval to each payment", () => {
		expect(planDueDates("2026-11-15", 3, 30)).toEqual([
			"2026-11-15",
			"2026-12-15",
			"2027-01-14"
		])
	})

	it("puts two 14-day payments in November from the 5th", () => {
		expect(planDueDates("2026-11-05", 3, 14)).toEqual([
			"2026-11-05",
			"2026-11-19",
			"2026-12-03"
		])
	})

	it("ends where installmentEndDate says", () => {
		const dates = planDueDates("2026-11-15", 12, 30)
		expect(dates[11]).toBe(
			installmentEndDate({
				firstPurchasedAt: "2026-11-15",
				totalInstallments: 12,
				paymentIntervalDays: 30
			})
		)
	})

	it("returns nothing for an unreadable date", () => {
		expect(planDueDates("nope", 3, 30)).toEqual([])
	})
})

describe("planSummary", () => {
	it("describes the plan with its total", () => {
		expect(
			planSummary({
				firstPurchasedAt: "2026-11-15",
				count: 12,
				intervalDays: 30,
				amount: 50
			})
		).toBe(
			"12 payments of CAD 50.00, every 30 days, from 15 Nov 2026 to 11 Oct 2027. Total CAD 600.00."
		)
	})

	it("keeps the total exact in cents", () => {
		expect(
			planSummary({
				firstPurchasedAt: "2026-11-15",
				count: 3,
				intervalDays: 30,
				amount: 0.1
			})
		).toContain("Total CAD 0.30.")
	})

	it("is empty when the date can't be read", () => {
		expect(
			planSummary({
				firstPurchasedAt: "",
				count: 3,
				intervalDays: 30,
				amount: 1
			})
		).toBe("")
	})
})

describe("planPlacement", () => {
	const dates = ["2026-11-15", "2026-12-15", "2027-01-14", "2027-02-13"]

	it("counts the payments in opened months and those still waiting", () => {
		expect(planPlacement(dates, periods(11, 12), nov)).toEqual({
			created: 2,
			waiting: 2,
			inViewedMonth: 1,
			firstMonth: nov,
			lastMonth: { year: 2026, month: 12 }
		})
	})

	it("ignores a gap between opened months", () => {
		const placement = planPlacement(
			dates,
			[...periods(11), { year: 2027, month: 1 }],
			nov
		)
		expect(placement.created).toBe(2)
		expect(placement.lastMonth).toEqual({ year: 2027, month: 1 })
	})

	it("finds none when no month is opened", () => {
		const placement = planPlacement(dates, [], nov)
		expect(placement).toMatchObject({
			created: 0,
			waiting: 4,
			firstMonth: null,
			lastMonth: null
		})
	})
})

describe("planToast", () => {
	const label = "November 2026"

	it("names the months and says the rest will come", () => {
		const placement = planPlacement(
			["2026-11-15", "2026-12-15", "2027-01-14", "2027-02-13"],
			[...periods(11, 12), { year: 2027, month: 1 }],
			nov
		)
		expect(planToast(placement, label)).toBe(
			"3 payments added to Nov 2026 – Jan 2027. The rest will appear as those months are opened."
		)
	})

	it("drops the last sentence when every payment was placed", () => {
		const placement = planPlacement(
			["2026-11-05", "2026-11-19"],
			periods(11),
			nov
		)
		expect(planToast(placement, label)).toBe("2 payments added to Nov 2026.")
	})

	it("says so when none are in the month on screen", () => {
		const placement = planPlacement(
			["2026-12-05", "2027-01-04"],
			[...periods(12), { year: 2027, month: 1 }],
			nov
		)
		expect(planToast(placement, label)).toBe(
			"2 payments added to Dec 2026 – Jan 2027. None are in November 2026."
		)
	})

	it("uses the singular for one payment", () => {
		const placement = planPlacement(
			["2026-11-05", "2027-05-05"],
			periods(11),
			nov
		)
		expect(planToast(placement, label)).toBe(
			"1 payment added to Nov 2026. The rest will appear as those months are opened."
		)
	})

	it("is null when nothing was placed", () => {
		expect(planToast(planPlacement(["2026-11-05"], [], nov), label)).toBeNull()
	})
})

describe("planChangeApplies", () => {
	const now = new Date("2026-11-15T12:00:00Z")

	it("is true when the last payment is in the current month or later", () => {
		expect(planChangeApplies("2026-11-01", now)).toBe(true)
		expect(planChangeApplies("2027-03-10", now)).toBe(true)
	})

	it("is false when the plan ended in a past month", () => {
		expect(planChangeApplies("2026-10-31", now)).toBe(false)
	})

	it("follows the UTC month at the month boundary", () => {
		expect(
			planChangeApplies("2026-11-01", new Date("2026-11-01T00:00:00Z"))
		).toBe(true)
		expect(
			planChangeApplies("2026-10-31", new Date("2026-11-01T00:00:00Z"))
		).toBe(false)
	})
})

describe("planChangeMessage", () => {
	it("names the current month and the new amount", () => {
		expect(planChangeMessage(120.5, new Date("2026-11-15T12:00:00Z"))).toBe(
			"Payments in November 2026 and later will change to CAD 120.50. Earlier payments keep their amount."
		)
	})
})
