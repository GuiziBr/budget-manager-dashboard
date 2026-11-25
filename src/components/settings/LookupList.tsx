"use client"

import { EllipsisVertical, Plus } from "lucide-react"
import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { translations } from "@/constants/translations"
import { getApiErrorMessage } from "@/lib/api-error-message"
import { type LookupItem, sortLookups } from "@/lib/lookup-form"

export type LookupKind = keyof typeof translations.settings.list.items

/** The part of a TanStack query the list needs. */
export interface LookupQuery {
	data?: LookupItem[]
	isError: boolean
	error: unknown
	refetch: () => unknown
}

interface LookupListProps {
	lookup: LookupKind
	query: LookupQuery
	/** Wired up by the form (ST-06) and delete (ST-09) tasks. */
	onAdd?: () => void
	onEdit?: (item: LookupItem) => void
	onDelete?: (item: LookupItem) => void
}

const t = translations.settings.list

function badgeLabel(item: LookupItem): string | null {
	if ("hasBudgetEnvelope" in item && item.hasBudgetEnvelope) {
		return t.badges.category
	}
	if ("hasStatement" in item && item.hasStatement) return t.badges.paymentType
	return null
}

function LookupRow({
	item,
	onEdit,
	onDelete
}: {
	item: LookupItem
	onEdit?: (item: LookupItem) => void
	onDelete?: (item: LookupItem) => void
}) {
	const badge = badgeLabel(item)

	return (
		<li className="flex items-center gap-3 border-border border-b px-5 py-2 last:border-b-0">
			<span className="flex min-w-0 flex-1 items-center gap-2">
				<span className="truncate font-medium text-[15px] text-foreground">
					{item.name}
				</span>
				{badge && <Badge variant="primary">{badge}</Badge>}
			</span>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label={t.rowActions.replace("{name}", item.name)}
						className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:size-8"
					>
						<EllipsisVertical className="size-4" aria-hidden="true" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onSelect={() => onEdit?.(item)}>
						{t.edit}
					</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onSelect={() => onDelete?.(item)}
					>
						{t.delete}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</li>
	)
}

function AddButton({ onAdd }: { onAdd?: () => void }) {
	return (
		<Button variant="outline" className="gap-2" onClick={onAdd}>
			<Plus className="size-4" aria-hidden="true" />
			{t.add}
		</Button>
	)
}

/** One lookup (category, payment type, bank or store) as a card with its rows. */
export function LookupList({
	lookup,
	query,
	onAdd,
	onEdit,
	onDelete
}: LookupListProps) {
	const { title, plural } = t.items[lookup]
	const items = useMemo(
		() => (query.data ? sortLookups(query.data) : []),
		[query.data]
	)

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
	} else if (items.length === 0) {
		body = (
			<div className="flex flex-col items-center gap-3 px-5 py-8">
				<p className="text-muted-foreground text-sm">
					{t.empty.replace("{items}", plural)}
				</p>
				<AddButton onAdd={onAdd} />
			</div>
		)
	} else {
		body = (
			<ul aria-label={title}>
				{items.map((item) => (
					<LookupRow
						key={item.id}
						item={item}
						onEdit={onEdit}
						onDelete={onDelete}
					/>
				))}
			</ul>
		)
	}

	return (
		<Card>
			<CardHeader className="border-border border-b px-5 py-3">
				<CardTitle>{title}</CardTitle>
				<AddButton onAdd={onAdd} />
			</CardHeader>
			{body}
		</Card>
	)
}
