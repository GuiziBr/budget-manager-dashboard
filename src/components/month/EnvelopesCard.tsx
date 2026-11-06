"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { translations } from "@/constants/translations"
import { useMonthEnvelopes } from "@/hooks/use-budget-envelopes"
import { useCategories } from "@/hooks/use-categories"
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

const money = (value: number) =>
	`${translations.month.summary.currency}${formatCad(value, { compact: true })}`

function EnvelopeTile({
	status,
	onSelect
}: {
	status: EnvelopeStatus
	onSelect?: (envelope: BudgetEnvelope) => void
}) {
	const t = translations.month.envelopes
	const { categoryName, allocated, spent, ratio, overBudget, envelope } = status

	return (
		<li>
			<button
				type="button"
				onClick={() => onSelect?.(envelope)}
				className="flex w-full flex-col gap-2 rounded-[10px] border border-border bg-background p-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<span className="truncate text-[13px] font-medium text-foreground">
					{categoryName ?? t.deletedCategory}
				</span>
				<span
					className={cn(
						"text-sm font-semibold font-[family-name:var(--font-roboto)]",
						overBudget ? "text-danger" : "text-foreground"
					)}
				>
					{spent === null ? t.unavailable : money(spent)}
					<span className="font-normal text-muted-foreground">
						{" / "}
						{money(allocated)}
					</span>
				</span>
				{ratio !== null && (
					<Progress
						value={ratio * 100}
						variant={overBudget ? "danger" : "default"}
						aria-label={categoryName ?? t.deletedCategory}
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

	return (
		<section aria-label={t.label}>
			<Card className="flex flex-col gap-3 p-5">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold text-foreground">{t.title}</h2>
					{overCount > 0 && (
						<Badge variant="danger">
							{t.overBudget.replace("{n}", String(overCount))}
						</Badge>
					)}
					<Button
						variant="ghost"
						size="sm"
						className="ml-auto h-auto gap-1 p-0 text-xs font-semibold text-primary-text hover:bg-transparent hover:text-primary-text hover:underline"
						aria-expanded={!collapsed}
						aria-controls={bodyId}
						onClick={() => setCollapsed(!collapsed)}
					>
						{collapsed ? t.show : t.hide}
						{collapsed ? (
							<ChevronDown aria-hidden="true" className="size-3.5" />
						) : (
							<ChevronUp aria-hidden="true" className="size-3.5" />
						)}
					</Button>
				</div>
				{!collapsed && (
					<ul id={bodyId} className="grid grid-cols-4 gap-3">
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
