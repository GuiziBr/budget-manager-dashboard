"use client"

import { CircleAlert, EllipsisVertical } from "lucide-react"
import { ExpenseTypeChip } from "@/components/month/ExpenseTypeChip"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { translations } from "@/constants/translations"
import { formatDayMonth } from "@/lib/format-date"
import { formatCad } from "@/lib/money"
import type { MonthRow } from "@/lib/month-rows"
import { cn } from "@/lib/utils"

interface MonthRowProps {
	row: MonthRow
	selected: boolean
	onSelect: () => void
}

const t = translations.month.table
const { currency } = translations.month.summary

function paidLabel(row: MonthRow) {
	const template = row.unpaid ? t.unpaidState : t.paidState
	return template.replace("{item}", row.expense.description)
}

/** The paid control. Read-only until marking paid arrives (T-25); it stays at full strength in dimmed rows. */
function PaidCheckbox({
	row,
	className
}: {
	row: MonthRow
	className?: string
}) {
	return (
		<Checkbox
			checked={!row.unpaid}
			aria-readonly="true"
			aria-label={paidLabel(row)}
			className={className}
		/>
	)
}

export function MonthTableRow({ row, selected, onSelect }: MonthRowProps) {
	const { expense } = row
	const due = formatDayMonth(expense.dueAt)
	const paidDate = formatDayMonth(expense.paidAt)
	const dim = row.unpaid ? undefined : "opacity-50"
	const cell = "px-4 py-0"

	return (
		<tr
			onClick={onSelect}
			aria-current={selected ? "true" : undefined}
			className={cn(
				"h-[60px] cursor-pointer border-border border-b transition-colors last:border-b-0 hover:bg-accent/50",
				selected && "bg-accent"
			)}
		>
			<td className={cn(cell, dim)}>
				<ExpenseTypeChip row={row} />
			</td>
			<td className={cn(cell, dim)}>
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation()
						onSelect()
					}}
					className="max-w-full cursor-pointer truncate rounded text-left font-medium text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{expense.description}
				</button>
			</td>
			<td className={cn(cell, dim)}>
				<Badge className="px-2 py-0.5 text-[11px]">{row.category}</Badge>
			</td>
			<td
				className={cn(cell, dim, "truncate text-[13px] text-muted-foreground")}
			>
				{row.paymentType}
			</td>
			<td className={cn(cell, dim, "whitespace-nowrap text-[13px]")}>
				{row.overdue ? (
					<span className="flex items-center gap-1.5 font-semibold text-danger">
						<CircleAlert className="size-3.5" aria-hidden="true" />
						<span className="sr-only">{t.overdue}</span>
						{due}
					</span>
				) : (
					<span className="text-muted-foreground">{due ?? t.noDate}</span>
				)}
			</td>
			<td className={cell}>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: keeps a checkbox click from also selecting the row */}
				<div
					className="flex items-center gap-1.5"
					onClick={(event) => event.stopPropagation()}
					onKeyDown={(event) => event.stopPropagation()}
				>
					<PaidCheckbox row={row} />
					{paidDate && (
						<span className="text-muted-foreground text-xs">{paidDate}</span>
					)}
				</div>
			</td>
			<td className={cn(cell, dim, "whitespace-nowrap font-medium text-sm")}>
				{currency}
				{formatCad(expense.amount, { compact: true })}
			</td>
			<td className={cn(cell, dim)}>
				<button
					type="button"
					aria-label={t.rowActions.replace("{item}", expense.description)}
					onClick={(event) => event.stopPropagation()}
					className="flex size-8 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<EllipsisVertical className="size-4" aria-hidden="true" />
				</button>
			</td>
		</tr>
	)
}

/** One row of the phone list: checkbox, item with its chip and date line, amount. */
export function MonthListRow({ row, selected, onSelect }: MonthRowProps) {
	const { expense } = row
	const due = formatDayMonth(expense.dueAt)
	const paidDate = formatDayMonth(expense.paidAt)
	const dim = row.unpaid ? undefined : "opacity-50"

	let meta: string | null = null
	if (!row.unpaid && paidDate) meta = t.paidOn.replace("{date}", paidDate)
	else if (row.overdue && due) meta = t.overdueOn.replace("{date}", due)
	else if (due) meta = t.dueOn.replace("{date}", due)

	return (
		<li
			aria-current={selected ? "true" : undefined}
			className={cn(
				"flex items-center gap-3 border-border border-b px-3.5 py-3 last:border-b-0",
				selected && "bg-accent"
			)}
		>
			<PaidCheckbox row={row} className="size-6 rounded-[7px]" />
			<button
				type="button"
				onClick={onSelect}
				className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<span className={cn("flex min-w-0 flex-1 flex-col gap-[5px]", dim)}>
					<span className="truncate font-medium text-[15px] text-foreground">
						{expense.description}
					</span>
					<span className="flex items-center gap-1.5">
						<ExpenseTypeChip row={row} size="small" />
						{row.overdue && (
							<CircleAlert
								className="size-3 shrink-0 text-danger"
								aria-hidden="true"
							/>
						)}
						{meta && (
							<span
								className={cn(
									"truncate text-xs",
									row.overdue
										? "font-semibold text-danger"
										: "text-muted-foreground"
								)}
							>
								{meta}
							</span>
						)}
					</span>
				</span>
				<span
					className={cn(
						"whitespace-nowrap font-semibold text-[15px] text-foreground",
						dim
					)}
				>
					{currency}
					{formatCad(expense.amount, { compact: true })}
				</span>
			</button>
		</li>
	)
}
