"use client"

import { ChevronDown, ChevronUp, CircleAlert } from "lucide-react"
import Link from "next/link"
import { type RefObject, useMemo, useState } from "react"
import {
	DetailsField,
	DetailsSection,
	DetailsSheet,
	PositionCounter,
	StepButton
} from "@/components/month/DetailsSheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { translations } from "@/constants/translations"
import { useArrowKeyNavigation } from "@/hooks/use-arrow-key-navigation"
import {
	EXPENSES_PAGE_SIZE,
	useExpense,
	useMonthExpensesPage
} from "@/hooks/use-expenses"
import { useMonthPage } from "@/hooks/use-month-page"
import { useMonthSort } from "@/hooks/use-month-sort"
import { useRecurringExpense } from "@/hooks/use-recurring-expense"
import { formatFullDate, formatMonthYear } from "@/lib/format-date"
import { formatCad } from "@/lib/money"
import {
	buildRows,
	type MonthRow,
	rowInstallmentEndDate
} from "@/lib/month-rows"
import { RECURRING_PATH } from "@/lib/navigation"
import type { Expense, Id } from "@/types"

interface ExpenseDetailsPanelProps {
	/** The month on screen; its page is where a row is looked up first. */
	periodId: Id
	/** The expense named by the address, if any. The panel is open while this is set and the expense is known. */
	expenseId: Id | null
	onClose: () => void
	/** Shows the previous or next expense, which may be on the neighbouring page. Without it the arrows are left out. */
	onNavigate?: (expense: Expense, page: number) => void
	/** Past months are read-only: no actions. */
	canEdit: boolean
	returnFocusRef?: RefObject<HTMLElement | null>
	/** Wired in T-25, T-29 and T-30. Until then the buttons do nothing. */
	onTogglePaid?: (expense: Expense) => void
	onEdit?: (expense: Expense) => void
	onDelete?: (expense: Expense) => void
}

const t = translations.month.details
const { currency } = translations.month.summary

const money = (value: number) =>
	`${currency}${formatCad(value, { compact: true })}`

const orNone = (value: string | null) => value ?? t.none

function RecurringSection({ row }: { row: MonthRow }) {
	const bill = useRecurringExpense(row.expense.recurringExpenseId ?? undefined)
	const started = formatMonthYear(bill.data?.startedAt)

	return (
		<DetailsSection minRows={DETAILS_ROWS}>
			<DetailsField label={t.fields.month}>
				{t.recurringMonth.replace(
					"{n}",
					row.monthsRunning === null ? t.none : String(row.monthsRunning)
				)}
			</DetailsField>
			<DetailsField label={t.fields.started}>
				{bill.isLoading ? (
					<Skeleton className="ml-auto h-4 w-16" />
				) : (
					orNone(started)
				)}
			</DetailsField>
			<DetailsField label={t.viewRecurring}>
				<Link
					href={RECURRING_PATH}
					className="rounded text-primary-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{translations.navigation.items.recurring}
				</Link>
			</DetailsField>
		</DetailsSection>
	)
}

interface NavigationTarget {
	expense: Expense
	page: number
}

const withPage = (
	expense: Expense | undefined,
	page: number
): NavigationTarget | undefined => expense && { expense, page }

// The most rows any tab has (Payment and Installment plan), so every tab is as tall
const DETAILS_ROWS = 4

type DetailsTab = "payment" | "dates" | "plan" | "recurring"

function PanelBody({
	row,
	canEdit,
	onTogglePaid,
	onEdit,
	onDelete
}: {
	row: MonthRow
	canEdit: boolean
} & Pick<ExpenseDetailsPanelProps, "onTogglePaid" | "onEdit" | "onDelete">) {
	const { expense, installment } = row
	// Payment and Dates always apply; the other two only for that kind of expense
	const available: DetailsTab[] = [
		"payment",
		"dates",
		...(installment ? (["plan"] as const) : []),
		...(row.type === "recurring" ? (["recurring"] as const) : [])
	]
	const [tab, setTab] = useState<DetailsTab>("payment")
	// Stepping to an expense without the chosen tab falls back to Payment
	const activeTab = available.includes(tab) ? tab : "payment"
	const status = row.overdue
		? { variant: "danger" as const, label: t.status.overdue }
		: row.unpaid
			? { variant: "default" as const, label: t.status.unpaid }
			: { variant: "success" as const, label: t.status.paid }

	return (
		<>
			<div className="flex items-center justify-between gap-3 px-5">
				<span className="font-[family-name:var(--font-roboto)] font-semibold text-[30px] text-foreground leading-none tracking-[-0.5px]">
					{money(expense.amount)}
				</span>
				<Badge className="min-w-0 px-2 py-0.5 text-[11px]">
					{row.category}
				</Badge>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(value) => setTab(value as DetailsTab)}
				className="px-5"
			>
				{available.length > 1 && (
					<TabsList aria-label={t.sectionsLabel}>
						{available.map((id) => (
							<TabsTrigger key={id} value={id}>
								{t.sections[id]}
							</TabsTrigger>
						))}
					</TabsList>
				)}
				<TabsContent value="payment">
					<DetailsSection minRows={DETAILS_ROWS}>
						<DetailsField label={t.fields.status}>
							<Badge variant={status.variant} className="px-2.5">
								{row.overdue && (
									<CircleAlert className="size-3" aria-hidden="true" />
								)}
								{status.label}
							</Badge>
						</DetailsField>
						<DetailsField label={t.fields.paymentType}>
							{row.paymentType}
						</DetailsField>
						<DetailsField label={t.fields.bank}>
							{orNone(row.bank)}
						</DetailsField>
						<DetailsField label={t.fields.store}>
							{orNone(row.store)}
						</DetailsField>
					</DetailsSection>
				</TabsContent>
				<TabsContent value="dates">
					<DetailsSection minRows={DETAILS_ROWS}>
						<DetailsField label={t.fields.purchased}>
							{orNone(formatFullDate(expense.purchasedAt))}
						</DetailsField>
						<DetailsField label={t.fields.due}>
							<span className={row.overdue ? "text-danger" : undefined}>
								{orNone(formatFullDate(expense.dueAt))}
							</span>
						</DetailsField>
						<DetailsField label={t.fields.paid}>
							{orNone(formatFullDate(expense.paidAt))}
						</DetailsField>
					</DetailsSection>
				</TabsContent>
				{installment && (
					<TabsContent value="plan">
						<DetailsSection minRows={DETAILS_ROWS}>
							<DetailsField label={t.fields.payment}>
								{t.installmentProgress
									.replace(
										"{n}",
										installment.number === null
											? t.none
											: String(installment.number)
									)
									.replace("{total}", String(installment.total))}
							</DetailsField>
							<DetailsField label={t.fields.interval}>
								{t.intervalDays.replace(
									"{days}",
									String(installment.paymentIntervalDays)
								)}
							</DetailsField>
							<DetailsField label={t.fields.firstPurchase}>
								{orNone(formatFullDate(installment.firstPurchasedAt))}
							</DetailsField>
							<DetailsField label={t.fields.endDate}>
								{orNone(formatFullDate(rowInstallmentEndDate(installment)))}
							</DetailsField>
						</DetailsSection>
					</TabsContent>
				)}
				{row.type === "recurring" && (
					<TabsContent value="recurring">
						<RecurringSection row={row} />
					</TabsContent>
				)}
			</Tabs>

			{canEdit && (
				<div className="mt-auto flex flex-col gap-2 px-5 pb-5">
					<Button onClick={() => onTogglePaid?.(expense)}>
						{row.unpaid ? t.markPaid : t.markUnpaid}
					</Button>
					<div className="flex gap-2">
						<Button
							variant="outline"
							className="flex-1"
							onClick={() => onEdit?.(expense)}
						>
							{t.edit}
						</Button>
						<Button
							variant="destructive"
							className="flex-1"
							onClick={() => onDelete?.(expense)}
						>
							{t.delete}
						</Button>
					</div>
				</div>
			)}
		</>
	)
}

/**
 * Everything about one expense, including what the table leaves out (M-08).
 * The row comes from the page the table already loaded, so it follows refetches
 * and optimistic changes; an expense that isn't on that page (a shared link) is
 * read by id instead. A recurring row also reads its bill, for the month it started.
 */
export function ExpenseDetailsPanel({
	periodId,
	expenseId,
	onClose,
	onNavigate,
	canEdit,
	returnFocusRef,
	...actions
}: ExpenseDetailsPanelProps) {
	const { page } = useMonthPage()
	const { sort } = useMonthSort()
	const query = useMonthExpensesPage(periodId, page, sort)
	const onPage = expenseId
		? query.data?.data.find((expense) => expense.id === expenseId)
		: undefined
	// Asked for only once the page is known not to hold it (a shared link)
	const detail = useExpense(
		!expenseId || query.isPending || onPage ? undefined : expenseId
	)
	const row = useMemo(() => {
		const found = onPage ?? detail.data
		return found ? buildRows([found], new Date())[0] : null
	}, [onPage, detail.data])

	// Neighbours in the order of the table. At the edge of a page the arrow
	// continues onto the neighbouring page, which is read only when needed.
	// An expense that isn't on the page on screen has no neighbours.
	const rows = query.data?.data ?? []
	const position = rows.findIndex((expense) => expense.id === expenseId)
	const total = query.data?.total ?? 0
	const totalPages = Math.ceil(total / EXPENSES_PAGE_SIZE)
	// Place in the whole month (not just this page), known only for a row on the page on screen
	const ordinal =
		position >= 0 ? (page - 1) * EXPENSES_PAGE_SIZE + position + 1 : null
	const atFirst = position === 0
	const atLast = position >= 0 && position === rows.length - 1
	const before = useMonthExpensesPage(
		atFirst && page > 1 ? periodId : undefined,
		page - 1,
		sort
	)
	const after = useMonthExpensesPage(
		atLast && page < totalPages ? periodId : undefined,
		page + 1,
		sort
	)
	// A page that is still loading shows the previous one (placeholder), which isn't a neighbour
	const edge = (neighbour: typeof before, pick: "first" | "last") => {
		if (neighbour.isPlaceholderData || !neighbour.data?.data.length)
			return undefined
		const list = neighbour.data.data
		return list[pick === "first" ? 0 : list.length - 1]
	}
	const previous: NavigationTarget | undefined =
		position > 0
			? { expense: rows[position - 1], page }
			: atFirst && page > 1
				? withPage(edge(before, "last"), page - 1)
				: undefined
	const next: NavigationTarget | undefined =
		position >= 0 && position < rows.length - 1
			? { expense: rows[position + 1], page }
			: atLast && page < totalPages
				? withPage(edge(after, "first"), page + 1)
				: undefined

	const stepTo = (target: NavigationTarget | undefined) =>
		target && onNavigate
			? () => onNavigate(target.expense, target.page)
			: undefined
	const stepPrevious = stepTo(previous)
	const stepNext = stepTo(next)
	useArrowKeyNavigation(
		expenseId !== null && row !== null,
		stepPrevious,
		stepNext
	)

	// The content stays while the sheet slides out, after the selection is cleared
	const [lastRow, setLastRow] = useState(row)
	if (row && row !== lastRow) setLastRow(row)
	const shown = row ?? lastRow

	if (!shown) return null

	return (
		<DetailsSheet
			open={expenseId !== null && row !== null}
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			headerActions={
				onNavigate && (
					<>
						{ordinal !== null && (
							<PositionCounter
								ordinal={ordinal}
								total={total}
								label={t.position}
							/>
						)}
						<StepButton
							label={t.previousExpense}
							icon={ChevronUp}
							onStep={stepPrevious}
						/>
						<StepButton
							label={t.nextExpense}
							icon={ChevronDown}
							onStep={stepNext}
						/>
					</>
				)
			}
			title={shown.expense.description}
			description={t.expenseDescription}
			returnFocusRef={returnFocusRef}
		>
			<PanelBody row={shown} canEdit={canEdit} {...actions} />
		</DetailsSheet>
	)
}
