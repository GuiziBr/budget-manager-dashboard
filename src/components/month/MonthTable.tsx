"use client"

import { useEffect, useMemo } from "react"
import { MonthListRow, MonthTableRow } from "@/components/month/MonthTableRow"
import { Pagination } from "@/components/Pagination"
import { SortableHeader } from "@/components/SortableHeader"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { translations } from "@/constants/translations"
import { EXPENSES_PAGE_SIZE, useMonthExpensesPage } from "@/hooks/use-expenses"
import { PHONE_QUERY, useMediaQuery } from "@/hooks/use-media-query"
import { useMonthPage } from "@/hooks/use-month-page"
import { useMonthSort } from "@/hooks/use-month-sort"
import { getApiErrorMessage } from "@/lib/api-error-message"
import type { SortColumn } from "@/lib/expense-sort"
import { buildRows, type MonthRow } from "@/lib/month-rows"
import { cn } from "@/lib/utils"
import type { Id } from "@/types/common"
import type { Expense } from "@/types/expense"

interface MonthTableProps {
	periodId: Id
	/** Past months are read-only, so the empty state offers no Add button. */
	canEdit: boolean
	/** Opens the expense form (wired in T-26). Without it the empty state shows no button. */
	onAddExpense?: () => void
	/** The expense whose details are open; its row is highlighted. */
	selectedId?: Id | null
	/** Opens the expense's details. */
	onSelectRow?: (row: MonthRow) => void
	/** Ticks or unticks an expense's paid control. Ignored when `canEdit` is false. */
	onTogglePaid?: (expense: Expense) => void
	/** Opens an expense in the form. Without it the row menu is left out. Ignored when `canEdit` is false. */
	onEdit?: (expense: Expense) => void
	/** Asks to delete an expense. Ignored when `canEdit` is false. */
	onDelete?: (expense: Expense) => void
}

const t = translations.month.table
const frame =
	"shrink-0 overflow-hidden rounded-[14px] border border-border bg-card"
// From lg the table frame fills what the page leaves and its rows scroll inside it
const scrollFrame = `${frame} lg:flex lg:min-h-[240px] lg:shrink lg:flex-col`
// Sticky so the titles stay visible; an inset shadow draws the border because collapsed borders don't stick
const headerCell =
	"sticky top-0 z-10 bg-background px-4 py-0 text-left font-semibold text-[13px] text-muted-foreground shadow-[inset_0_-1px_0_var(--border)]"

const columns = [
	{ key: "number", width: "w-[100px]" },
	{ key: "item", width: "w-[200px]" },
	{ key: "category", width: undefined },
	{ key: "payment", width: "w-[150px]" },
	{ key: "due", width: "w-[110px]" },
	{ key: "paid", width: "w-[140px]" },
	{ key: "amount", width: "w-[130px]" },
	{ key: "actions", width: "w-[52px]" }
] as const

// # and the row menu are never sortable
const isSortable = (key: (typeof columns)[number]["key"]): key is SortColumn =>
	key !== "number" && key !== "actions"

export function MonthTable({
	periodId,
	canEdit,
	onAddExpense,
	selectedId = null,
	onSelectRow,
	onTogglePaid,
	onEdit,
	onDelete
}: MonthTableProps) {
	const isPhone = useMediaQuery(PHONE_QUERY)
	const { page, setPage, replacePage } = useMonthPage()
	const { sort, indicatorFor, toggleSort } = useMonthSort()
	const query = useMonthExpensesPage(periodId, page, sort)

	const { data, isPlaceholderData } = query
	const totalPages = Math.max(
		1,
		Math.ceil((data?.total ?? 0) / EXPENSES_PAGE_SIZE)
	)

	// A page that no longer exists (the last one emptied, or a typed address) shows the last one
	useEffect(() => {
		if (data && !isPlaceholderData && page > totalPages) replacePage(totalPages)
	}, [data, isPlaceholderData, page, totalPages, replacePage])

	// Built once per fetched page: `now` only matters to the overdue check
	const rows = useMemo(
		() => (data ? buildRows(data.data, new Date()) : []),
		[data]
	)

	if (query.isLoading) {
		return (
			<div role="status" className={frame}>
				<span className="sr-only">{t.loading}</span>
				{Array.from({ length: 8 }, (_, index) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
						key={index}
						className="flex h-[60px] items-center border-border border-b px-4 last:border-b-0"
					>
						<Skeleton className="h-4 w-full" />
					</div>
				))}
			</div>
		)
	}

	if (query.isError && !data) {
		return (
			<div
				role="alert"
				className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
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

	if (rows.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-4 py-12 text-center">
				<p className="font-medium text-foreground">{t.emptyTitle}</p>
				{canEdit && onAddExpense && (
					<Button onClick={onAddExpense}>{t.addExpense}</Button>
				)}
			</div>
		)
	}

	const toggleFor = (row: MonthRow) =>
		canEdit && onTogglePaid ? () => onTogglePaid(row.expense) : undefined

	const editFor = (row: MonthRow) =>
		canEdit && onEdit ? () => onEdit(row.expense) : undefined

	const deleteFor = (row: MonthRow) =>
		canEdit && onDelete ? () => onDelete(row.expense) : undefined

	const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
	// The current page stays on screen, a little faded, while the next one loads
	const fade = isPlaceholderData && "opacity-60 transition-opacity"
	const total = data?.total ?? 0
	const summary = t.showing
		.replace("{from}", String((page - 1) * EXPENSES_PAGE_SIZE + 1))
		.replace("{to}", String(Math.min(page * EXPENSES_PAGE_SIZE, total)))
		.replace("{total}", String(total))
	const footer = (
		<Pagination
			currentPage={page}
			setCurrentPage={setPage}
			pages={pages}
			summary={summary}
		/>
	)

	if (isPhone) {
		return (
			<div className={frame}>
				<ul aria-label={t.label} className={fade || undefined}>
					{rows.map((row) => (
						<MonthListRow
							key={row.expense.id}
							row={row}
							selected={selectedId === row.expense.id}
							onSelect={() => onSelectRow?.(row)}
							onTogglePaid={toggleFor(row)}
						/>
					))}
				</ul>
				{footer}
			</div>
		)
	}

	return (
		<div className={scrollFrame}>
			<div className={cn("lg:min-h-0 lg:overflow-y-auto", fade)}>
				<table aria-label={t.label} className="w-full table-fixed">
					<colgroup>
						{columns.map(({ key, width }) => (
							<col key={key} className={width} />
						))}
					</colgroup>
					<thead>
						<tr className="h-10 border-border border-b bg-background">
							{columns.map(({ key }) =>
								isSortable(key) ? (
									<SortableHeader
										key={key}
										column={key}
										label={t.columns[key]}
										indicator={indicatorFor(key)}
										onSort={(column) => toggleSort(column as SortColumn)}
										className={headerCell}
									/>
								) : (
									<th key={key} scope="col" className={headerCell}>
										{key === "actions" ? (
											<span className="sr-only">{t.columns.actions}</span>
										) : (
											t.columns[key]
										)}
									</th>
								)
							)}
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<MonthTableRow
								key={row.expense.id}
								row={row}
								selected={selectedId === row.expense.id}
								onSelect={() => onSelectRow?.(row)}
								onTogglePaid={toggleFor(row)}
								onEdit={editFor(row)}
								onDelete={deleteFor(row)}
							/>
						))}
					</tbody>
				</table>
			</div>
			{footer}
		</div>
	)
}
