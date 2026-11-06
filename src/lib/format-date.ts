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
