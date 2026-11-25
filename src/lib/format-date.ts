const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec"
]

/**
 * "28 Nov" for an ISO date or timestamp, read in UTC like the rest of the month
 * maths. Returns null for a missing or unreadable value.
 */
export function formatDayMonth(
	value: string | null | undefined
): string | null {
	if (!value) return null
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return null
	return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
}

/**
 * "10 Nov 2023" for an ISO date or timestamp, read in UTC. Returns null for a
 * missing or unreadable value.
 */
export function formatFullDate(
	value: string | null | undefined
): string | null {
	const dayMonth = formatDayMonth(value)
	if (!dayMonth || !value) return null
	return `${dayMonth} ${new Date(value).getUTCFullYear()}`
}

/** "Nov 2025" for an ISO date or timestamp, read in UTC. Returns null for a missing or unreadable value. */
export function formatMonthYear(
	value: string | null | undefined
): string | null {
	if (!value) return null
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return null
	return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** Today as "YYYY-MM-DD" in UTC, the day a "mark as paid" is recorded on. */
export function todayIso(now: Date = new Date()): string {
	return now.toISOString().slice(0, 10)
}

/**
 * "07/06/2022" (month/day/year) for an ISO date or timestamp, read in UTC. Returns
 * null for a missing or unreadable value.
 */
export function formatNumericDate(
	value: string | null | undefined
): string | null {
	if (!value) return null
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return null
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())}/${date.getUTCFullYear()}`
}
