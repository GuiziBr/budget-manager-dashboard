import { translations } from "@/constants/translations"
import { formatFullDate, formatMonthYear } from "@/lib/format-date"
import { formatCad } from "@/lib/money"
import type { Month } from "@/lib/month"
import type { BudgetPeriod } from "@/types"

const t = translations.month.form.plan

/** The most payments a plan can have in the form (the field takes three digits). */
export const MAX_PAYMENTS = 999

const toCents = (value: number) => Math.round(value * 100)

export interface PlanInput {
	firstPurchasedAt: string
	count: number
	intervalDays: number
	amount: number
}

/** Due date of each payment: first purchase + (n - 1) x interval days, in UTC ("YYYY-MM-DD"). */
export function planDueDates(
	firstPurchasedAt: string,
	count: number,
	intervalDays: number
): string[] {
	const start = new Date(`${firstPurchasedAt.slice(0, 10)}T00:00:00Z`)
	if (Number.isNaN(start.getTime())) return []
	return Array.from({ length: count }, (_, index) => {
		const due = new Date(start)
		due.setUTCDate(due.getUTCDate() + index * intervalDays)
		return due.toISOString().slice(0, 10)
	})
}

/** "12 payments of CAD 50.00, every 30 days, from 15 Nov 2026 to 6 Oct 2027. Total CAD 600.00." */
export function planSummary(plan: PlanInput): string {
	const dates = planDueDates(
		plan.firstPurchasedAt,
		plan.count,
		plan.intervalDays
	)
	const first = dates[0]
	const last = dates[dates.length - 1]
	if (!first || !last) return ""
	return t.summary
		.replace("{count}", String(plan.count))
		.replace("{amount}", formatCad(plan.amount))
		.replace("{interval}", String(plan.intervalDays))
		.replace("{start}", formatFullDate(first) ?? first)
		.replace("{end}", formatFullDate(last) ?? last)
		.replace("{total}", formatCad((toCents(plan.amount) * plan.count) / 100))
}

export interface PlanPlacement {
	/** Payments whose month is already opened: the backend creates these now. */
	created: number
	/** Payments in months not opened yet: they appear when those months are opened. */
	waiting: number
	/** Payments that land in the month on screen. */
	inViewedMonth: number
	firstMonth: Month | null
	lastMonth: Month | null
}

const monthOf = (date: string): Month => ({
	year: Number(date.slice(0, 4)),
	month: Number(date.slice(5, 7))
})

const monthIndex = ({ year, month }: Month) => year * 12 + month

/** Where the payments go: by their due dates, against the opened months. */
export function planPlacement(
	dueDates: readonly string[],
	periods: readonly Pick<BudgetPeriod, "year" | "month">[],
	viewed: Month
): PlanPlacement {
	const opened = new Set(periods.map((period) => monthIndex(period)))
	let created = 0
	let inViewedMonth = 0
	let firstMonth: Month | null = null
	let lastMonth: Month | null = null
	for (const date of dueDates) {
		const month = monthOf(date)
		if (!opened.has(monthIndex(month))) continue
		created += 1
		if (monthIndex(month) === monthIndex(viewed)) inViewedMonth += 1
		if (!firstMonth || monthIndex(month) < monthIndex(firstMonth)) {
			firstMonth = month
		}
		if (!lastMonth || monthIndex(month) > monthIndex(lastMonth)) {
			lastMonth = month
		}
	}
	return {
		created,
		waiting: dueDates.length - created,
		inViewedMonth,
		firstMonth,
		lastMonth
	}
}

const monthText = (month: Month): string =>
	formatMonthYear(`${month.year}-${String(month.month).padStart(2, "0")}-01`) ??
	""

/**
 * The toast after saving a plan: "3 payments added to Nov 2026 – Jan 2027. The rest will
 * appear as those months are opened." Null when no payment landed in an opened month.
 */
export function planToast(
	placement: PlanPlacement,
	viewedLabel: string
): string | null {
	const { firstMonth, lastMonth } = placement
	if (!firstMonth || !lastMonth) return null
	const range =
		monthIndex(firstMonth) === monthIndex(lastMonth)
			? monthText(firstMonth)
			: `${monthText(firstMonth)} – ${monthText(lastMonth)}`
	const parts = [
		(placement.created === 1 ? t.addedOne : t.added)
			.replace("{count}", String(placement.created))
			.replace("{range}", range)
	]
	if (placement.inViewedMonth === 0) {
		parts.push(t.notInViewed.replace("{month}", viewedLabel))
	}
	if (placement.waiting > 0) parts.push(t.rest)
	return parts.join(" ")
}
