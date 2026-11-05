import type { BudgetPeriod } from "@/types/budget-period"

// Every month decision is made in UTC, the same reference the backend uses
export interface Month {
	year: number
	month: number
}

export type MonthComparison = "past" | "current" | "future"

const PERIOD_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

// Intl only names the month: Date.UTC maps years 0-99 to 1900-1999 and Intl
// renders year 0 as "1", so the year comes from the parsed value instead
const monthNameFormatter = new Intl.DateTimeFormat("en-US", {
	month: "long",
	timeZone: "UTC"
})

const monthIndex = ({ year, month }: Month) => year * 12 + (month - 1)

const fromIndex = (index: number): Month => ({
	year: Math.floor(index / 12),
	month: (index % 12) + 1
})

export function currentMonth(now: Date = new Date()): Month {
	return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
}

export function parseMonth(value: string | null | undefined): Month | null {
	const match = value ? PERIOD_PATTERN.exec(value) : null
	if (!match) return null
	return { year: Number(match[1]), month: Number(match[2]) }
}

export function formatMonth({ year, month }: Month): string {
	return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`
}

// An invalid or missing `?period=` falls back to the current month
export function resolveMonth(
	value: string | null | undefined,
	now: Date = new Date()
): Month {
	return parseMonth(value) ?? currentMonth(now)
}

export function prevMonth(month: Month): Month {
	return fromIndex(monthIndex(month) - 1)
}

// December of next year is the latest month the backend accepts
export function maxMonth(now: Date = new Date()): Month {
	return { year: now.getUTCFullYear() + 1, month: 12 }
}

export function nextMonth(month: Month, now: Date = new Date()): Month | null {
	const next = fromIndex(monthIndex(month) + 1)
	return monthIndex(next) > monthIndex(maxMonth(now)) ? null : next
}

export function compareMonth(
	month: Month,
	now: Date = new Date()
): MonthComparison {
	const diff = monthIndex(month) - monthIndex(currentMonth(now))
	if (diff < 0) return "past"
	return diff === 0 ? "current" : "future"
}

export function monthLabel({ year, month }: Month): string {
	const name = monthNameFormatter.format(new Date(Date.UTC(2000, month - 1, 1)))
	return `${name} ${year}`
}

// The API doesn't guarantee an order, so look the period up instead of indexing
export function findPeriod(
	periods: BudgetPeriod[],
	{ year, month }: Month
): BudgetPeriod | undefined {
	return periods.find(
		(period) => period.year === year && period.month === month
	)
}

export interface PeriodYearGroup {
	year: number
	periods: BudgetPeriod[]
}

// Newest year first, newest month first inside each year (the API order is not guaranteed)
export function groupPeriodsByYear(periods: BudgetPeriod[]): PeriodYearGroup[] {
	const sorted = [...periods].sort(
		(a, b) => b.year - a.year || b.month - a.month
	)
	const groups: PeriodYearGroup[] = []
	for (const period of sorted) {
		const last = groups[groups.length - 1]
		if (last && last.year === period.year) last.periods.push(period)
		else groups.push({ year: period.year, periods: [period] })
	}
	return groups
}
