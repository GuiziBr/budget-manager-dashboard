"use client"

import { Check, EllipsisVertical, Minus } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { Pagination } from "@/components/Pagination"
import { SortableHeader } from "@/components/SortableHeader"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { translations } from "@/constants/translations"
import { getApiErrorMessage } from "@/lib/api-error-message"
import { formatNumericDate } from "@/lib/format-date"
import type { LookupFormValues, LookupItem } from "@/lib/lookup-form"
import {
	changedAt,
	DEFAULT_LOOKUP_SORT,
	type LookupColumn,
	type LookupSort,
	lookupFlag,
	nextLookupSort,
	pageOf,
	sortLookupRows
} from "@/lib/lookup-table"
import { LookupAddForm } from "./LookupAddForm"

export type LookupKind = keyof typeof translations.settings.list.items

/** The part of a TanStack query the list needs. */
export interface LookupQuery {
	data?: LookupItem[]
	isError: boolean
	error: unknown
	refetch: () => Promise<{ data?: LookupItem[] }>
}

interface LookupListProps {
	lookup: LookupKind
	query: LookupQuery
	/** Sends a new item and resolves once the list is refreshed. */
	create: (values: LookupFormValues) => Promise<unknown>
	/** Gets the row menu's button too, to hand the focus back when the panel closes. */
	onEdit?: (item: LookupItem, opener: HTMLElement | null) => void
	/** Gets the item to delete and the row menu's button; the section asks for the confirmation. */
	onDelete?: (item: LookupItem, opener: HTMLElement | null) => void
}

const t = translations.settings.list
const cell = "px-3 py-3 text-sm text-foreground md:px-4"

function FlagCell({ on }: { on: boolean }) {
	return on ? (
		<>
			<Check className="size-4 text-success" aria-hidden="true" />
			<span className="sr-only">{t.yes}</span>
		</>
	) : (
		<>
			<Minus className="size-4 text-muted-foreground" aria-hidden="true" />
			<span className="sr-only">{t.no}</span>
		</>
	)
}

function LookupRow({
	item,
	hasFlag,
	onEdit,
	onDelete
}: {
	item: LookupItem
	hasFlag: boolean
	onEdit?: (item: LookupItem, opener: HTMLElement | null) => void
	onDelete?: (item: LookupItem, opener: HTMLElement | null) => void
}) {
	const triggerRef = useRef<HTMLButtonElement>(null)
	return (
		<tr className="border-border border-b last:border-b-0">
			<td className={`${cell} truncate font-medium`}>{item.name}</td>
			{hasFlag && (
				<td className={cell}>
					<FlagCell on={lookupFlag(item)} />
				</td>
			)}
			<td className={`${cell} text-muted-foreground`}>
				{formatNumericDate(item.createdAt)}
			</td>
			<td className={`${cell} text-muted-foreground`}>
				{formatNumericDate(changedAt(item))}
			</td>
			<td className="w-14 px-2 text-right">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							ref={triggerRef}
							type="button"
							aria-label={t.rowActions.replace("{name}", () => item.name)}
							className="inline-flex size-11 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:size-8"
						>
							<EllipsisVertical className="size-4" aria-hidden="true" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onSelect={() => onEdit?.(item, triggerRef.current)}
						>
							{t.edit}
						</DropdownMenuItem>
						<DropdownMenuItem
							variant="destructive"
							onSelect={() => onDelete?.(item, triggerRef.current)}
						>
							{t.delete}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</td>
		</tr>
	)
}

/**
 * One lookup (category, payment type, bank or store): a card to add an item, and a card
 * with the sortable table of items, 8 to a page. The API returns the lists whole, so
 * sorting and paging happen here.
 */
export function LookupList({
	lookup,
	query,
	create,
	onEdit,
	onDelete
}: LookupListProps) {
	const { title, plural } = t.items[lookup]
	const hasFlag = lookup === "category" || lookup === "paymentType"
	const flagLabel = hasFlag ? t.flags[lookup] : ""
	const [sort, setSort] = useState<LookupSort>(DEFAULT_LOOKUP_SORT)
	const [requestedPage, setRequestedPage] = useState(1)

	const sorted = useMemo(
		() => (query.data ? sortLookupRows(query.data, sort) : []),
		[query.data, sort]
	)
	const { rows, page, pages, from, to, total } = pageOf(sorted, requestedPage)

	const toggleSort = (column: string) => {
		setSort((current) => nextLookupSort(current, column as LookupColumn))
		setRequestedPage(1)
	}
	const indicator = (column: LookupColumn) =>
		sort.column !== column ? "" : sort.direction === "asc" ? "↑" : "↓"

	let body: React.ReactNode
	if (query.isError) {
		body = (
			<div
				role="alert"
				className="flex flex-wrap items-center justify-between gap-3 p-5"
			>
				<div>
					<p className="font-medium text-foreground">
						{t.loadError.replace("{items}", plural)}
					</p>
					<p className="text-muted-foreground text-sm">
						{getApiErrorMessage(query.error, { action: "mutate" })}
					</p>
				</div>
				<Button variant="outline" onClick={() => query.refetch()}>
					{t.retry}
				</Button>
			</div>
		)
	} else if (!query.data) {
		body = (
			<div role="status" className="flex flex-col gap-3 p-5">
				<span className="sr-only">{t.loading}</span>
				<Skeleton className="h-10" />
				<Skeleton className="h-10" />
				<Skeleton className="h-10" />
			</div>
		)
	} else if (total === 0) {
		body = (
			<p className="px-5 py-8 text-center text-muted-foreground text-sm">
				{t.empty.replace("{items}", plural)}
			</p>
		)
	} else {
		body = (
			<>
				{/* relative: the header's sr-only text is absolute and would otherwise escape the scroll and widen the page */}
				<div className="relative overflow-x-auto">
					<table aria-label={title} className="w-full min-w-[34rem]">
						<thead>
							<tr className="border-border border-b bg-background">
								<SortableHeader
									column="name"
									label={t.columns.name}
									indicator={indicator("name")}
									onSort={toggleSort}
								/>
								{hasFlag && (
									<SortableHeader
										column="flag"
										label={flagLabel}
										indicator={indicator("flag")}
										onSort={toggleSort}
									/>
								)}
								<SortableHeader
									column="createdAt"
									label={t.columns.createdAt}
									indicator={indicator("createdAt")}
									onSort={toggleSort}
								/>
								<th
									scope="col"
									className="bg-background/60 px-3 py-3 text-left font-semibold text-[13px] text-muted-foreground md:px-4"
								>
									{t.columns.updatedAt}
								</th>
								<th scope="col" className="w-14 bg-background/60">
									<span className="sr-only">
										{t.rowActions.replace("{name}", "")}
									</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((item) => (
								<LookupRow
									key={item.id}
									item={item}
									hasFlag={hasFlag}
									onEdit={onEdit}
									onDelete={onDelete}
								/>
							))}
						</tbody>
					</table>
				</div>
				<Pagination
					currentPage={page}
					setCurrentPage={setRequestedPage}
					pages={pages}
					summary={t.summary
						.replace("{from}", String(from))
						.replace("{to}", String(to))
						.replace("{total}", String(total))
						.replace("{items}", plural)}
				/>
			</>
		)
	}

	return (
		<div className="flex flex-col gap-4">
			<section className="rounded-xl border border-border bg-card p-5">
				<h2 className="mb-4 font-semibold text-foreground text-xl">{title}</h2>
				<LookupAddForm
					lookup={lookup}
					items={query.data ?? []}
					reload={async () => (await query.refetch()).data}
					create={create}
				/>
			</section>
			<section
				aria-label={title}
				className="overflow-hidden rounded-xl border border-border bg-card"
			>
				{body}
			</section>
		</div>
	)
}
