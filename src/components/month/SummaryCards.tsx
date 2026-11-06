"use client"

import { ArrowDownLeft, ArrowUpRight, ChevronRight, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { translations } from "@/constants/translations"
import { PHONE_QUERY, useMediaQuery } from "@/hooks/use-media-query"
import { useMonthSummary } from "@/hooks/use-month-summary"
import { getApiErrorMessage } from "@/lib/api-error-message"
import { formatCad } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { Id } from "@/types/common"

interface SummaryCardsProps {
	periodId: Id
	/** Opens the income panel (wired in T-23). */
	onViewIncome?: () => void
}

const labelClass = "text-[13px] font-medium"

/** The amount with the currency sign attached, as in the design. */
function MetricValue({
	value,
	className
}: {
	value: number
	className?: string
}) {
	const amount = formatCad(Math.abs(value), { compact: true })
	const negative = formatCad(value, { compact: true }).startsWith("- ")
	const { currency } = translations.month.summary

	return (
		<span
			className={cn(
				"flex items-center gap-[5px] text-[30px] font-semibold leading-none tracking-[-0.5px] font-[family-name:var(--font-roboto)]",
				className
			)}
		>
			{negative && <span>-</span>}
			<span>
				{currency}
				{amount}
			</span>
		</span>
	)
}

export function SummaryCards({ periodId, onViewIncome }: SummaryCardsProps) {
	const t = translations.month.summary
	const summary = useMonthSummary(periodId)
	const isPhone = useMediaQuery(PHONE_QUERY)

	if (summary.status === "loading") {
		return (
			<div role="status" className="grid grid-cols-1 gap-3 lg:grid-cols-3">
				<span className="sr-only">{t.loading}</span>
				{isPhone ? (
					<Skeleton className="h-40" />
				) : (
					<>
						<Skeleton className="h-24" />
						<Skeleton className="h-24" />
						<Skeleton className="h-24" />
					</>
				)}
			</div>
		)
	}

	if (summary.status === "error") {
		return (
			<div
				role="alert"
				className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
			>
				<div>
					<p className="font-medium text-foreground">{t.loadError}</p>
					<p className="text-sm text-muted-foreground">
						{getApiErrorMessage(summary.error, { action: "mutate" })}
					</p>
				</div>
				<Button variant="outline" onClick={summary.refetch}>
					{translations.month.states.retry}
				</Button>
			</div>
		)
	}

	const { income, expenses, balance } = summary.totals

	if (isPhone) {
		return (
			<section aria-label={t.label}>
				<Card className="flex flex-col gap-1.5 border-transparent bg-primary p-[18px] text-primary-foreground">
					<div className="flex items-center gap-1.5 text-primary-foreground/80">
						<Scale aria-hidden="true" className="size-3.5" />
						<span className={labelClass}>{t.balance}</span>
					</div>
					<MetricValue
						value={balance}
						className="text-[32px] tracking-[-0.6px]"
					/>
					<div className="flex gap-3 pt-2.5">
						<button
							type="button"
							onClick={onViewIncome}
							className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-[10px] border border-primary-foreground/20 bg-primary-foreground/12 px-2.5 py-2 text-left"
						>
							<span className="flex items-center justify-between text-xs text-primary-foreground/80">
								{t.income}
								<ChevronRight aria-hidden="true" className="size-3.5" />
							</span>
							<span className="text-base font-semibold font-[family-name:var(--font-roboto)]">
								{t.currency}
								{formatCad(income, { compact: true })}
							</span>
						</button>
						<div className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-[10px] border border-transparent bg-primary-foreground/12 px-2.5 py-2">
							<span className="text-xs text-primary-foreground/80">
								{t.expenses}
							</span>
							<span className="text-base font-semibold font-[family-name:var(--font-roboto)]">
								{t.currency}
								{formatCad(expenses, { compact: true })}
							</span>
						</div>
					</div>
				</Card>
			</section>
		)
	}

	return (
		<section
			aria-label={t.label}
			className="grid grid-cols-1 gap-3 lg:grid-cols-3"
		>
			<Card className="flex flex-col gap-1.5 p-5">
				<div className="flex items-center gap-1.5 text-muted-foreground">
					<ArrowDownLeft aria-hidden="true" className="size-3.5" />
					<span className={labelClass}>{t.income}</span>
					<Button
						variant="ghost"
						size="sm"
						className="ml-auto h-auto gap-1 p-0 text-xs font-semibold text-primary-text hover:bg-transparent hover:text-primary-text hover:underline"
						onClick={onViewIncome}
					>
						{t.viewAll}
						<ChevronRight aria-hidden="true" className="size-3.5" />
					</Button>
				</div>
				<MetricValue value={income} className="text-success" />
			</Card>
			<Card className="flex flex-col gap-1.5 p-5">
				<div className="flex items-center gap-1.5 text-muted-foreground">
					<ArrowUpRight aria-hidden="true" className="size-3.5" />
					<span className={labelClass}>{t.expenses}</span>
				</div>
				<MetricValue value={expenses} />
			</Card>
			<Card className="flex flex-col gap-1.5 border-transparent bg-primary p-5 text-primary-foreground">
				<div className="flex items-center gap-1.5 text-primary-foreground/80">
					<Scale aria-hidden="true" className="size-3.5" />
					<span className={labelClass}>{t.balance}</span>
				</div>
				<MetricValue value={balance} />
			</Card>
		</section>
	)
}
