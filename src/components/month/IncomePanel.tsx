"use client"

import { EllipsisVertical, Plus, X } from "lucide-react"
import { type RefObject, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { translations } from "@/constants/translations"
import { useMonthIncomes } from "@/hooks/use-incomes"
import { PHONE_QUERY, useMediaQuery } from "@/hooks/use-media-query"
import { getApiErrorMessage } from "@/lib/api-error-message"
import { formatDayMonth } from "@/lib/format-date"
import { formatCad } from "@/lib/money"
import { type Month, monthLabel } from "@/lib/month"
import { incomeSummary, sortIncomes } from "@/lib/month-incomes"
import { cn } from "@/lib/utils"
import type { Income } from "@/types"
import type { Id } from "@/types/common"

interface IncomePanelProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	periodId: Id
	month: Month
	/** Past months are read-only: no Add and no row menu. */
	canEdit: boolean
	/** The control that opened the panel; it gets the focus back on close. */
	returnFocusRef?: RefObject<HTMLElement | null>
	/** Wired in T-32. Until then the buttons do nothing. */
	onAdd?: () => void
	onEdit?: (income: Income) => void
	onDelete?: (income: Income) => void
}

const t = translations.month.income
const { currency } = translations.month.summary

const money = (value: number) =>
	`${currency}${formatCad(value, { compact: true })}`

function IncomeRow({
	income,
	canEdit,
	onEdit,
	onDelete
}: {
	income: Income
	canEdit: boolean
	onEdit?: (income: Income) => void
	onDelete?: (income: Income) => void
}) {
	const received = formatDayMonth(income.receivedAt)

	return (
		<li className="flex items-center gap-3 border-border border-b px-5 py-3.5 last:border-b-0">
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="flex min-w-0 items-center gap-2">
					<span className="truncate font-medium text-[15px] text-foreground">
						{income.description}
					</span>
					{income.isSalary && <Badge variant="primary">{t.salary}</Badge>}
				</span>
				<span className="text-muted-foreground text-xs">
					{received ? t.received.replace("{date}", received) : t.notReceived}
				</span>
			</div>
			{/* A muted colour marks an income that has not arrived yet */}
			<span
				className={cn(
					"whitespace-nowrap font-semibold text-[15px]",
					received ? "text-success" : "text-muted-foreground"
				)}
			>
				+ {money(income.amount)}
			</span>
			{canEdit && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							aria-label={t.rowActions.replace("{item}", income.description)}
							className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<EllipsisVertical className="size-4" aria-hidden="true" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onSelect={() => onEdit?.(income)}>
							{t.edit}
						</DropdownMenuItem>
						<DropdownMenuItem
							variant="destructive"
							onSelect={() => onDelete?.(income)}
						>
							{t.delete}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</li>
	)
}

function PanelBody({
	periodId,
	canEdit,
	onAdd,
	onEdit,
	onDelete
}: Omit<IncomePanelProps, "open" | "onOpenChange" | "month">) {
	const query = useMonthIncomes(periodId)
	const incomes = useMemo(
		() => (query.data ? sortIncomes(query.data) : []),
		[query.data]
	)

	if (query.isError) {
		return (
			<div
				role="alert"
				className="mx-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
			>
				<div>
					<p className="font-medium text-foreground">{t.loadError}</p>
					<p className="text-muted-foreground text-sm">
						{getApiErrorMessage(query.error, { action: "mutate" })}
					</p>
				</div>
				<Button variant="outline" onClick={() => query.refetch()}>
					{t.retry}
				</Button>
			</div>
		)
	}

	if (!query.data) {
		return (
			<div role="status" className="flex flex-col gap-3 px-5">
				<span className="sr-only">{t.loading}</span>
				<Skeleton className="h-16" />
				<Skeleton className="h-12" />
				<Skeleton className="h-12" />
			</div>
		)
	}

	const { total, salary } = incomeSummary(incomes)

	return (
		<>
			<div className="flex flex-col gap-1 px-5">
				<span className="text-[13px] font-medium text-muted-foreground">
					{t.total}
				</span>
				<span className="font-[family-name:var(--font-roboto)] font-semibold text-[30px] text-success leading-none tracking-[-0.5px]">
					{money(total)}
				</span>
				<span className="pt-1 text-muted-foreground text-sm">
					{salary > 0
						? t.ofSalary.replace("{amount}", money(salary))
						: t.noSalary}
				</span>
			</div>
			{incomes.length === 0 ? (
				<p className="px-5 py-8 text-center text-muted-foreground text-sm">
					{t.empty}
				</p>
			) : (
				<ul
					aria-label={t.title}
					className="min-h-0 flex-1 overflow-y-auto border-border border-t"
				>
					{incomes.map((income) => (
						<IncomeRow
							key={income.id}
							income={income}
							canEdit={canEdit}
							onEdit={onEdit}
							onDelete={onDelete}
						/>
					))}
				</ul>
			)}
			{canEdit && (
				<div className="mt-auto px-5 pb-5">
					<Button variant="outline" className="w-full gap-2" onClick={onAdd}>
						<Plus className="size-4" aria-hidden="true" />
						{t.add}
					</Button>
				</div>
			)}
		</>
	)
}

/**
 * The month's incomes, in a side panel from the right on desktop and a bottom sheet
 * on the phone. Listed here, never on the page itself (M-07).
 */
export function IncomePanel({
	open,
	onOpenChange,
	month,
	returnFocusRef,
	...body
}: IncomePanelProps) {
	const isPhone = useMediaQuery(PHONE_QUERY)

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side={isPhone ? "bottom" : "right"}
				// Land on the panel itself, not on the first row's menu button
				onOpenAutoFocus={(event) => {
					event.preventDefault()
					;(event.currentTarget as HTMLElement | null)?.focus()
				}}
				onCloseAutoFocus={(event) => {
					const opener = returnFocusRef?.current
					if (!opener?.isConnected) return
					event.preventDefault()
					opener.focus()
				}}
				showCloseButton={false}
				className={cn(
					"gap-4 pt-5 pb-0 outline-none",
					isPhone ? "max-h-[85dvh] rounded-t-[20px]" : "w-full sm:max-w-[440px]"
				)}
			>
				<SheetClose asChild>
					<Button
						variant="outline"
						size="icon"
						className="absolute top-4 right-5 size-8 rounded-[10px] shadow-none"
					>
						<X className="size-4" aria-hidden="true" />
						<span className="sr-only">{t.close}</span>
					</Button>
				</SheetClose>
				<SheetHeader className="p-0 px-5 pr-14">
					<SheetTitle className="text-lg">{t.title}</SheetTitle>
					<SheetDescription>
						{t.description.replace("{month}", monthLabel(month))}
					</SheetDescription>
				</SheetHeader>
				<PanelBody {...body} />
			</SheetContent>
		</Sheet>
	)
}
