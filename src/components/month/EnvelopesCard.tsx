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
	/** Opens the envelope's details (wired in T-24). */
	onSelectEnvelope?: (envelope: BudgetEnvelope) => void
}

const money = (value: number) => formatCad(value, { compact: true })

type NamedEnvelopeStatus = EnvelopeStatus & { categoryName: string }

const hasCategory = (status: EnvelopeStatus): status is NamedEnvelopeStatus =>
	status.categoryName !== null

function EnvelopeTile({
	status,
	onSelect
}: {
	status: NamedEnvelopeStatus
	onSelect?: (envelope: BudgetEnvelope) => void
}) {
	const t = translations.month.envelopes
	const { categoryName, allocated, spent, ratio, overBudget, envelope } = status
	const name = categoryName

	return (
		<li>
			<button
				type="button"
				onClick={() => onSelect?.(envelope)}
				className="flex w-full flex-col gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
	onSelect
}: {
	status: NamedEnvelopeStatus
	onSelect?: (envelope: BudgetEnvelope) => void
}) {
	const t = translations.month.envelopes
	const { categoryName, allocated, spent, ratio, overBudget, envelope } = status

	return (
		<li className="shrink-0">
			<button
				type="button"
				onClick={() => onSelect?.(envelope)}
				className={cn(
					"flex w-[136px] flex-col gap-2 rounded-[14px] border bg-card p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					overBudget ? "border-danger" : "border-border"
				)}
			>
				<span className="truncate text-[13px] font-medium text-foreground">
					{categoryName}
				</span>
				<span className="flex items-end gap-[3px]">
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
						aria-label={categoryName}
						className="h-[5px]"
					/>
				)}
			</button>
		</li>
	)
}

export function EnvelopesCard({
	periodId,
	onSelectEnvelope
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
		// An envelope whose category isn't in the lookup has no name to show, so it is left out
		return sortEnvelopes(
			envelopes.data.map((e) => envelopeStatus(e, names))
		).filter(hasCategory)
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
				<div className="flex items-center justify-between pt-1">
					<div className="flex items-center gap-2">
						<h2 className="text-base font-semibold text-foreground">
							{t.title}
						</h2>
						{overCount > 0 && (
							<Badge variant="danger" className="px-2 font-semibold">
								{t.overBudgetShort.replace("{n}", String(overCount))}
							</Badge>
						)}
					</div>
				</div>
				<ul className="flex gap-2.5 overflow-x-auto">
					{statuses.map((status) => (
						<PhoneEnvelopeTile
							key={status.envelope.id}
							status={status}
							onSelect={onSelectEnvelope}
						/>
					))}
				</ul>
			</section>
		)
	}

	return (
		<section aria-label={t.label}>
			<Card className="flex flex-col gap-4 px-5 py-3.5">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-muted-foreground">
						<WalletCards aria-hidden="true" className="size-3.5" />
						<h2 className="text-[13px] font-medium">{t.title}</h2>
						{overCount > 0 && (
							<Badge variant="danger" className="px-2 font-semibold">
								{t.overBudget.replace("{n}", String(overCount))}
							</Badge>
						)}
					</div>
					<Button
						variant="ghost"
						className="h-8 gap-1.5 rounded-[10px] px-2.5 text-[13px] font-medium text-muted-foreground"
						aria-expanded={!collapsed}
						aria-controls={bodyId}
						onClick={() => setCollapsed(!collapsed)}
					>
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
					</Button>
				</div>
				{!collapsed && (
					<ul id={bodyId} className="grid grid-cols-4 gap-x-7 gap-y-4">
						{statuses.map((status) => (
							<EnvelopeTile
								key={status.envelope.id}
								status={status}
								onSelect={onSelectEnvelope}
							/>
						))}
					</ul>
				)}
			</Card>
		</section>
	)
}
