import { Layers, Repeat } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { translations } from "@/constants/translations"
import type { MonthRow } from "@/lib/month-rows"
import { cn } from "@/lib/utils"

interface ExpenseTypeChipProps {
	row: MonthRow
	/** The phone list uses a slightly smaller chip. */
	size?: "default" | "small"
}

/** `79/104` for an installment, `11` (months running) for a recurring bill, nothing for a one-time expense. */
export function ExpenseTypeChip({
	row,
	size = "default"
}: ExpenseTypeChipProps) {
	const t = translations.month.table
	const small = size === "small"
	const className = cn(
		small ? "px-[7px] py-0.5 text-[11px]" : "px-2 py-[3px] text-xs"
	)
	const iconClass = small ? "size-[11px]" : "size-3"

	if (row.type === "installment" && row.installment) {
		const { number, total } = row.installment
		return (
			<Badge variant="primary" className={className}>
				<Layers className={iconClass} aria-hidden="true" />
				{t.installment
					.replace("{n}", number === null ? t.noDate : String(number))
					.replace("{total}", String(total))}
			</Badge>
		)
	}

	if (row.type === "recurring") {
		return (
			<Badge variant="primary" className={className}>
				<Repeat className={iconClass} aria-hidden="true" />
				{t.recurring.replace(
					"{n}",
					row.monthsRunning === null ? t.noDate : String(row.monthsRunning)
				)}
			</Badge>
		)
	}

	return null
}
