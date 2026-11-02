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
