"use client"

import { ChevronDown, ChevronUp, WalletCards } from "lucide-react"
import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { translations } from "@/constants/translations"
import { useMonthEnvelopes } from "@/hooks/use-budget-envelopes"
import { useCategories } from "@/hooks/use-categories"
import { PHONE_QUERY, useMediaQuery } from "@/hooks/use-media-query"
import { usePersistedBoolean } from "@/hooks/use-persisted-boolean"
import { getApiErrorMessage } from "@/lib/api-error-message"
import { formatCad } from "@/lib/money"
import {
	type EnvelopeStatus,
	envelopeStatus,
	sortEnvelopes
} from "@/lib/month-rows"
import { cn } from "@/lib/utils"
import type { BudgetEnvelope } from "@/types"
import type { Id } from "@/types/common"

export const ENVELOPES_COLLAPSED_KEY = "month.envelopes.collapsed"

interface EnvelopesCardProps {
	periodId: Id
	/** Opens the envelope's details. */
	onSelectEnvelope?: (envelope: BudgetEnvelope) => void
	/** The envelope whose details are open; its tile is highlighted. */
	selectedEnvelopeId?: Id | null
}

const money = (value: number) =>
	`${translations.month.summary.currency}${formatCad(value, { compact: true })}`

// A category deleted after the envelope's month has no name left (G-12)
const nameOf = (status: EnvelopeStatus) =>
	status.categoryName ?? translations.month.details.deleted

function EnvelopeTile({
	status,
	selected,
	onSelect
}: {
	status: EnvelopeStatus
	selected: boolean
	onSelect?: (envelope: BudgetEnvelope) => void
}) {
	const t = translations.month.envelopes
	const { allocated, spent, ratio, overBudget, envelope } = status
	const name = nameOf(status)

	return (
		<li>
			<button
				type="button"
				onClick={() => onSelect?.(envelope)}
				aria-current={selected ? "true" : undefined}
				className={cn(
					"flex w-full cursor-pointer flex-col gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					selected && "bg-accent"
				)}
			>
				<span className="flex w-full items-center justify-between gap-2">
					<span className="truncate text-[13px] font-medium text-foreground">
						{name}
					</span>
					<span className="flex shrink-0 items-end gap-[3px] text-xs">
						<span
							className={cn(
								"font-semibold",
								overBudget ? "text-danger" : "text-foreground"
							)}
						>
							{spent === null ? t.unavailable : money(spent)}
						</span>
						<span className="text-muted-foreground">/ {money(allocated)}</span>
					</span>
				</span>
				{ratio !== null && (
					<Progress
						value={ratio * 100}
						variant={overBudget ? "danger" : "default"}
						aria-label={name}
						className="h-1.5"
					/>
				)}
			</button>
		</li>
	)
}

function PhoneEnvelopeTile({
	status,
	selected,
	onSelect
}: {
	status: EnvelopeStatus
	selected: boolean
	onSelect?: (envelope: BudgetEnvelope) => void
}) {
	const t = translations.month.envelopes
	const { allocated, spent, ratio, overBudget, envelope } = status
	const name = nameOf(status)

	return (
		<li className="shrink-0">
			<button
				type="button"
				onClick={() => onSelect?.(envelope)}
				aria-current={selected ? "true" : undefined}
				className={cn(
					"flex w-[160px] flex-col gap-2 rounded-[14px] border p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					selected ? "bg-accent" : "bg-card",
					overBudget ? "border-danger" : "border-border"
				)}
			>
				<span className="truncate text-[13px] font-medium text-foreground">
					{name}
				</span>
				<span className="flex items-end gap-[3px] whitespace-nowrap">
					<span
						className={cn(
							"text-base font-semibold font-[family-name:var(--font-roboto)]",
							overBudget ? "text-danger" : "text-foreground"
						)}
					>
						{spent === null ? t.unavailable : money(spent)}
					</span>
					<span className="text-[11px] text-muted-foreground">
						/ {money(allocated)}
					</span>
				</span>
				{ratio !== null && (
					<Progress
						value={ratio * 100}
						variant={overBudget ? "danger" : "default"}
						aria-label={name}
						className="h-[5px]"
					/>
				)}
			</button>
		</li>
	)
}

function CollapseHeader({
	collapsed,
	controls,
	onToggle,
	className,
	children
}: {
	collapsed: boolean
	controls: string
	onToggle: () => void
	className?: string
	children: React.ReactNode
}) {
	const t = translations.month.envelopes
	return (
		<h2 className="m-0">
			<button
				type="button"
				aria-expanded={!collapsed}
				aria-controls={controls}
				onClick={onToggle}
				className={cn(
					"group flex w-full items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					className
				)}
			>
				<span className="flex items-center gap-2">{children}</span>
				<span className="inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-medium text-muted-foreground group-hover:bg-muted">
					<span className="grid text-right">
						<span
							aria-hidden={collapsed}
							className={cn(
								"col-start-1 row-start-1",
								collapsed && "invisible"
							)}
						>
							{t.hide}
						</span>
						<span
							aria-hidden={!collapsed}
							className={cn(
								"col-start-1 row-start-1",
								!collapsed && "invisible"
							)}
						>
							{t.show}
						</span>
					</span>
					{collapsed ? (
						<ChevronDown aria-hidden="true" className="size-4" />
					) : (
						<ChevronUp aria-hidden="true" className="size-4" />
					)}
				</span>
			</button>
		</h2>
	)
}

export function EnvelopesCard({
	periodId,
	onSelectEnvelope,
	selectedEnvelopeId = null
}: EnvelopesCardProps) {
	const t = translations.month.envelopes
	const envelopes = useMonthEnvelopes(periodId)
	const categories = useCategories()
	const isPhone = useMediaQuery(PHONE_QUERY)
	const [collapsed, setCollapsed] = usePersistedBoolean(
		ENVELOPES_COLLAPSED_KEY,
		false
	)

	const statuses = useMemo(() => {
		if (!envelopes.data || !categories.data) return null
		const names = new Map(categories.data.map((c) => [c.id, c.name]))
		return sortEnvelopes(envelopes.data.map((e) => envelopeStatus(e, names)))
	}, [envelopes.data, categories.data])

	const failed = [envelopes, categories].find((q) => q.isError)
	if (failed) {
		return (
			<div
				role="alert"
				className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
			>
				<div>
					<p className="font-medium text-foreground">{t.loadError}</p>
					<p className="text-sm text-muted-foreground">
						{getApiErrorMessage(failed.error, { action: "mutate" })}
					</p>
				</div>
				<Button
					variant="outline"
					onClick={() => {
						for (const q of [envelopes, categories]) {
							if (q.isError) q.refetch()
						}
					}}
				>
					{translations.month.states.retry}
				</Button>
			</div>
		)
	}

	if (!statuses) {
		return (
			<div role="status">
				<span className="sr-only">{t.loading}</span>
				<Skeleton className="h-28" />
			</div>
		)
	}

	if (statuses.length === 0) return null

	const overCount = statuses.filter((s) => s.overBudget).length
	const bodyId = "month-envelopes-body"

	if (isPhone) {
		return (
			<section aria-label={t.label} className="flex flex-col gap-2.5">
				<CollapseHeader
					collapsed={collapsed}
					controls={bodyId}
					onToggle={() => setCollapsed(!collapsed)}
				>
					<span className="text-base font-semibold text-foreground">
						{t.title}
					</span>
					{overCount > 0 && (
						<Badge variant="danger" className="px-2 font-semibold">
							{t.overBudgetShort.replace("{n}", String(overCount))}
						</Badge>
					)}
				</CollapseHeader>
				{!collapsed && (
					<ul id={bodyId} className="flex gap-2.5 overflow-x-auto">
						{statuses.map((status) => (
							<PhoneEnvelopeTile
								key={status.envelope.id}
								status={status}
								selected={status.envelope.id === selectedEnvelopeId}
								onSelect={onSelectEnvelope}
							/>
						))}
					</ul>
				)}
			</section>
		)
	}

	return (
		<section aria-label={t.label}>
			<Card className="flex flex-col p-0">
				<CollapseHeader
					collapsed={collapsed}
					controls={bodyId}
					onToggle={() => setCollapsed(!collapsed)}
					className="rounded-[14px] px-5 py-3.5"
				>
					<WalletCards
						aria-hidden="true"
						className="size-3.5 text-muted-foreground"
					/>
					<span className="text-[13px] font-medium text-muted-foreground">
						{t.title}
					</span>
					{overCount > 0 && (
						<Badge variant="danger" className="px-2 font-semibold">
							{t.overBudget.replace("{n}", String(overCount))}
						</Badge>
					)}
				</CollapseHeader>
				{!collapsed && (
					<ul
						id={bodyId}
						className="grid grid-cols-4 gap-x-7 gap-y-4 px-5 pt-0.5 pb-3.5"
					>
						{statuses.map((status) => (
							<EnvelopeTile
								key={status.envelope.id}
								status={status}
								selected={status.envelope.id === selectedEnvelopeId}
								onSelect={onSelectEnvelope}
							/>
						))}
					</ul>
				)}
			</Card>
		</section>
	)
}
