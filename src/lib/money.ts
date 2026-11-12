export interface FormatCadOptions {
	// "plus" prefixes positive amounts (incomes); a negative amount always shows its minus
	sign?: "none" | "plus"
	// Drops the currency for lists where the totals next to them show it
	compact?: boolean
}

const CURRENCY = "CAD"

const numberFormatter = new Intl.NumberFormat("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
})

export function formatCad(
	value: number,
	{ sign = "none", compact = false }: FormatCadOptions = {}
): string {
	const formatted = numberFormatter.format(Math.abs(value))
	// Judge the sign on the rounded text so -0.004 reads "0.00", not "- 0.00"
	const isZero = formatted === "0.00"
	const prefix = value < 0 && !isZero ? "- " : sign === "plus" ? "+ " : ""
	return `${prefix}${compact ? "" : `${CURRENCY} `}${formatted}`
}

/** The largest amount the API accepts (docs/APIs/api-reference.md). */
export const MAX_AMOUNT = 99_999_999.99

export type MoneyCheck = "ok" | "invalid" | "tooLarge"

/** Whole or two-decimal digits, optionally grouped by thousands ("1,250.50"): no signs or exponents. */
const MONEY_PATTERN = /^(\d+|\d{1,3}(,\d{3})+)(\.\d{1,2})?$/

/** Checks text typed in an amount field: above 0, at most 2 decimals, at most `MAX_AMOUNT`. */
export function checkMoney(input: string): MoneyCheck {
	const text = input.trim()
	if (!MONEY_PATTERN.test(text)) return "invalid"
	const value = toNumber(text)
	if (value <= 0) return "invalid"
	return value > MAX_AMOUNT ? "tooLarge" : "ok"
}

/** The amount typed in a field, or `null` when it isn't valid. */
export function parseMoney(input: string): number | null {
	return checkMoney(input) === "ok" ? toNumber(input.trim()) : null
}

const toNumber = (text: string) => Number(text.replace(/,/g, ""))

/** Digits that fit under `MAX_AMOUNT` (99,999,999.99) when read as cents. */
const MAX_DIGITS = 10

/**
 * Formats an amount field as it is typed: the digits fill in from the cents, so
 * "10050" reads "100.50" and "1005000" reads "10,050.00". Anything that isn't a digit
 * is ignored, and digits beyond the largest amount are dropped.
 */
export function formatMoneyInput(raw: string): string {
	const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITS)
	if (!digits) return ""
	const padded = digits.padStart(3, "0")
	const whole = padded.slice(0, -2).replace(/\B(?=(\d{3})+$)/g, ",")
	return `${whole}.${padded.slice(-2)}`
}
