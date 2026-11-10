"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
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
import { Progress } from "@/components/ui/progress"
import { translations } from "@/constants/translations"
import { useArrowKeyNavigation } from "@/hooks/use-arrow-key-navigation"
import {
	useBudgetEnvelope,
	useMonthEnvelopes
} from "@/hooks/use-budget-envelopes"
import { useCategories } from "@/hooks/use-categories"
import { formatFullDate } from "@/lib/format-date"
import { formatCad } from "@/lib/money"
import { type Month, monthLabel } from "@/lib/month"
import {
	type EnvelopeStatus,
	envelopeRemaining,
	envelopeStatus,
	sortEnvelopes
} from "@/lib/month-rows"
import type { BudgetEnvelope, Id } from "@/types"

interface EnvelopeDetailsPanelProps {
	/** The month on screen; its envelopes are where one is looked up first. */
	periodId: Id
	month: Month
	/** The envelope named by the address, if any. The panel is open while this is set and the envelope is known. */
	envelopeId: Id | null
	onClose: () => void
	/** Shows the previous or next envelope. Without it the arrows are left out. */
	onNavigate?: (envelope: BudgetEnvelope) => void
	/** Past months are read-only: no Delete. */
	canEdit: boolean
	returnFocusRef?: RefObject<HTMLElement | null>
	/** Wired in T-33. Until then the button does nothing. */
	onDelete?: (envelope: BudgetEnvelope) => void
}

const t = translations.month.details
const { currency } = translations.month.summary

const money = (value: number) =>
	`${currency}${formatCad(value, { compact: true })}`

function PanelBody({
	status,
	canEdit,
	onDelete
}: {
	status: EnvelopeStatus
	canEdit: boolean
	onDelete?: (envelope: BudgetEnvelope) => void
}) {
	const { envelope, allocated, spent, ratio, overBudget } = status
	const remaining = envelopeRemaining(status)
	const updated = formatFullDate(envelope.spendUpdatedAt)

	return (
		<>
			<div className="flex flex-col gap-3 px-5">
				<span className="flex items-end gap-1.5">
					<span className="font-[family-name:var(--font-roboto)] font-semibold text-[30px] text-foreground leading-none tracking-[-0.5px]">
						{spent === null
							? translations.month.envelopes.unavailable
							: money(spent)}
					</span>
					<span className="pb-0.5 text-muted-foreground text-sm">
						/ {money(allocated)}
					</span>
				</span>
				{ratio !== null && (
					<Progress
						value={ratio * 100}
						variant={overBudget ? "danger" : "default"}
						aria-label={t.fields.spent}
						className="h-2"
					/>
				)}
				{/* The slot stays when the badge isn't shown, so the section below doesn't move up */}
				{spent !== null && (
					<div className="h-5">
						{overBudget && remaining !== null && (
							<Badge variant="danger" className="w-fit px-2.5">
								{t.overBy.replace("{amount}", money(Math.abs(remaining)))}
							</Badge>
						)}
					</div>
				)}
				{spent === null && (
					<p className="text-muted-foreground text-sm">{t.spendUnavailable}</p>
				)}
			</div>

			<div className="px-5">
				<DetailsSection>
					<DetailsField label={t.fields.budget}>
						{money(allocated)}
					</DetailsField>
					<DetailsField label={t.fields.spent}>
						{spent === null ? t.none : money(spent)}
					</DetailsField>
					<DetailsField label={t.fields.remaining}>
						{remaining === null ? (
							t.none
						) : (
							<span className={overBudget ? "text-danger" : undefined}>
								{remaining < 0 ? `-${money(-remaining)}` : money(remaining)}
							</span>
						)}
					</DetailsField>
					{updated && (
						<DetailsField label={t.fields.updated}>{updated}</DetailsField>
					)}
				</DetailsSection>
			</div>

			{canEdit && (
				<div className="mt-auto px-5 pb-5">
					<Button
						variant="destructive"
						className="w-full"
						onClick={() => onDelete?.(envelope)}
					>
						{t.delete}
					</Button>
				</div>
			)}
		</>
	)
}

/**
 * One envelope: spent, budget and what is left (M-11). The budget itself is
 * read-only (M-22). The envelope comes from the list the card already loaded,
 * so it follows refetches; one that isn't in it (a shared link) is read by id.
 */
export function EnvelopeDetailsPanel({
	periodId,
	month,
	envelopeId,
	onClose,
	onNavigate,
	canEdit,
	returnFocusRef,
	onDelete
}: EnvelopeDetailsPanelProps) {
	const envelopes = useMonthEnvelopes(periodId)
	const onList = envelopeId
		? envelopes.data?.find((e) => e.id === envelopeId)
		: undefined
	// Asked for only once the list is known not to hold it (a shared link)
	const detail = useBudgetEnvelope(
		!envelopeId || envelopes.isPending || onList ? undefined : envelopeId
	)
	const categories = useCategories()
	const status = useMemo(() => {
		const found = onList ?? detail.data
		if (!found || !categories.data) return null
		const names = new Map(categories.data.map((c) => [c.id, c.name]))
		return envelopeStatus(found, names)
	}, [onList, detail.data, categories.data])

	// Neighbours in the order of the card (over budget first). An envelope that
	// isn't on the list (a shared link) has none.
	const ordered = useMemo(
		() =>
			sortEnvelopes(
				(envelopes.data ?? []).map((e) => envelopeStatus(e, new Map()))
			).map((s) => s.envelope),
		[envelopes.data]
	)
	const position = ordered.findIndex((e) => e.id === envelopeId)
	const stepTo = (target: BudgetEnvelope | undefined) =>
		target && onNavigate ? () => onNavigate(target) : undefined
	const stepPrevious = position > 0 ? stepTo(ordered[position - 1]) : undefined
	const stepNext =
		position >= 0 && position < ordered.length - 1
			? stepTo(ordered[position + 1])
			: undefined
	useArrowKeyNavigation(
		envelopeId !== null && status !== null,
		stepPrevious,
		stepNext
	)

	// The content stays while the sheet slides out, after the selection is cleared
	const [lastStatus, setLastStatus] = useState(status)
	if (status && status !== lastStatus) setLastStatus(status)
	const shown = status ?? lastStatus

	if (!shown) return null

	return (
		<DetailsSheet
			open={envelopeId !== null && status !== null}
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			headerActions={
				onNavigate && (
					<>
						{position >= 0 && (
							<PositionCounter
								ordinal={position + 1}
								total={ordered.length}
								label={t.envelopePosition}
							/>
						)}
						<StepButton
							label={t.previousEnvelope}
							icon={ChevronUp}
							onStep={stepPrevious}
						/>
						<StepButton
							label={t.nextEnvelope}
							icon={ChevronDown}
							onStep={stepNext}
						/>
					</>
				)
			}
			title={shown.categoryName ?? t.deleted}
			description={t.envelopeDescription.replace("{month}", monthLabel(month))}
			returnFocusRef={returnFocusRef}
		>
			<PanelBody status={shown} canEdit={canEdit} onDelete={onDelete} />
		</DetailsSheet>
	)
}
