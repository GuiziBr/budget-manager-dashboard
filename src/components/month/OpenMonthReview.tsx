"use client"

import { DollarSign, Layers } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { DetailsSheet } from "@/components/month/DetailsSheet"
import { ReviewSection } from "@/components/month/ReviewSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { translations } from "@/constants/translations"
import { useMonthEnvelopes } from "@/hooks/use-budget-envelopes"
import { useCategories } from "@/hooks/use-categories"
import { useReviewExpenses, useSaveReviewBills } from "@/hooks/use-month-review"
import { formatCad, formatMoneyInput } from "@/lib/money"
import { type Month, monthLabel } from "@/lib/month"
import {
	amountToInput,
	diffBillAmounts,
	isLastPayment,
	splitReviewExpenses
} from "@/lib/month-review"
import { envelopeStatus, sortEnvelopes } from "@/lib/month-rows"
import type { Id } from "@/types"

const t = translations.month.review

interface OpenMonthReviewProps {
	onClose: () => void
	periodId: Id
	month: Month
}

/**
 * The review that opens after a month is created (M-02, step 3): the recurring bills
 * (amounts editable), the installment payments and the envelopes the backend generated.
 * Done saves the changed bill amounts; closing any other way keeps the month as generated.
 */
export function OpenMonthReview({
	onClose,
	periodId,
	month
}: OpenMonthReviewProps) {
	const label = monthLabel(month)
	const expenses = useReviewExpenses(periodId)
	const envelopes = useMonthEnvelopes(periodId)
	const categories = useCategories()
	const saveBills = useSaveReviewBills()

	// Only the fields that were touched; an untouched bill keeps its saved amount
	const [edits, setEdits] = useState<Record<Id, string>>({})
	// Amounts already saved, so a retry never resends them
	const [savedAmounts, setSavedAmounts] = useState<Record<Id, number>>({})
	const [failedIds, setFailedIds] = useState<ReadonlySet<Id>>(new Set())
	const saving = saveBills.isPending

	const { bills, installments } = useMemo(() => {
		const split = splitReviewExpenses(expenses.data ?? [])
		return {
			bills: split.bills.map((bill) => ({
				...bill,
				amount: savedAmounts[bill.id] ?? bill.amount
			})),
			installments: split.installments
		}
	}, [expenses.data, savedAmounts])

	const envelopeRows = useMemo(() => {
		if (!envelopes.data || !categories.data) return null
		const names = new Map(categories.data.map((c) => [c.id, c.name]))
		return sortEnvelopes(envelopes.data.map((e) => envelopeStatus(e, names)))
	}, [envelopes.data, categories.data])

	const { changes, invalidIds } = diffBillAmounts(bills, edits)
	const invalid = new Set(invalidIds)

	const done = async () => {
		if (invalidIds.length > 0 || saving) return
		if (changes.length === 0) {
			onClose()
			return
		}
		const result = await saveBills.mutateAsync(changes)
		if (result.saved.length > 0) {
			setSavedAmounts((current) => ({
				...current,
				...Object.fromEntries(result.saved.map((c) => [c.id, c.amount]))
			}))
		}
		setFailedIds(new Set(result.failed.map((c) => c.id)))
		if (result.failed.length === 0) {
			toast.success(t.ready.replace("{month}", label))
			onClose()
		}
	}

	const envelopesFailed = envelopes.isError ? envelopes : categories
	const failedCount = failedIds.size

	return (
		<DetailsSheet
			open
			onOpenChange={(next) => {
				// Hold off dismissal during a save, so the user sees whether it worked
				if (!next && !saving) onClose()
			}}
			title={t.title}
			titleAside={
				<span className="text-muted-foreground text-sm">{label}</span>
			}
			titleClassName="text-xl"
			separated
			fullHeight
			description={t.description.replace("{month}", label)}
		>
			<div className="flex min-h-0 flex-1 flex-col">
				<div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-4">
					<p className="text-muted-foreground text-sm">{t.intro}</p>

					<ReviewSection
						title={t.bills.title}
						isLoading={expenses.isPending}
						isError={expenses.isError}
						error={expenses.error}
						errorTitle={t.bills.loadError}
						onRetry={() => expenses.refetch()}
						isEmpty={bills.length === 0}
						empty={t.bills.empty}
					>
						<ul className="flex flex-col gap-2">
							{bills.map((bill) => (
								<li
									key={bill.id}
									className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
								>
									<div className="flex min-w-0 items-baseline gap-1.5 sm:flex-col sm:items-stretch sm:gap-0">
										<p className="min-w-0 truncate font-medium text-foreground text-sm">
											{bill.description}
										</p>
										{/* On the phone the category follows the name, after a dash; from sm up it sits under it */}
										<span
											aria-hidden="true"
											className="shrink-0 text-muted-foreground text-xs sm:hidden"
										>
											-
										</span>
										<p className="max-w-[45%] shrink-0 truncate text-muted-foreground text-xs sm:max-w-none">
											{bill.category.name}
										</p>
									</div>
									<Input
										value={edits[bill.id] ?? amountToInput(bill.amount)}
										onChange={(event) =>
											setEdits((current) => ({
												...current,
												[bill.id]: formatMoneyInput(event.target.value)
											}))
										}
										icon={DollarSign}
										inputMode="numeric"
										autoComplete="off"
										disabled={saving}
										aria-label={t.bills.amountLabel.replace(
											"{name}",
											bill.description
										)}
										aria-invalid={
											invalid.has(bill.id) || failedIds.has(bill.id)
										}
										className={
											invalid.has(bill.id) || failedIds.has(bill.id)
												? "w-36 shrink-0 border-danger focus-within:border-danger sm:w-40"
												: "w-36 shrink-0 sm:w-40"
										}
									/>
								</li>
							))}
						</ul>
						{failedCount > 0 && (
							<div
								role="alert"
								className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger px-3 py-2.5"
							>
								<p className="text-danger text-sm">
									{t.bills.saveFailed.replace("{n}", String(failedCount))}
								</p>
								<Button
									type="button"
									variant="outline"
									onClick={done}
									disabled={saving}
								>
									{t.bills.retry}
								</Button>
							</div>
						)}
					</ReviewSection>

					<ReviewSection
						title={t.installments.title}
						isLoading={expenses.isPending}
						isError={expenses.isError}
						error={expenses.error}
						errorTitle={t.installments.loadError}
						onRetry={() => expenses.refetch()}
						isEmpty={installments.length === 0}
						empty={t.installments.empty}
					>
						<ul className="flex flex-col gap-2">
							{installments.map((payment) => (
								<li
									key={payment.id}
									className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
								>
									<div className="flex min-w-0 items-center gap-2">
										<p className="min-w-0 truncate font-medium text-foreground text-sm">
											{payment.description}
										</p>
										<div className="flex shrink-0 flex-wrap items-center gap-1.5">
											<Badge variant="primary">
												<Layers className="size-3" aria-hidden="true" />
												{translations.month.table.installment
													.replace("{n}", String(payment.installmentNumber))
													.replace(
														"{total}",
														String(payment.installment?.totalInstallments)
													)}
											</Badge>
											{isLastPayment(payment) && (
												<Badge>{t.installments.lastPayment}</Badge>
											)}
										</div>
									</div>
									<span className="shrink-0 text-foreground text-sm">
										${formatCad(payment.amount, { compact: true })}
									</span>
								</li>
							))}
						</ul>
					</ReviewSection>

					<ReviewSection
						title={t.envelopes.title}
						hint={t.envelopes.hint}
						isLoading={!envelopeRows && !envelopesFailed.isError}
						isError={envelopes.isError || categories.isError}
						error={envelopesFailed.error}
						errorTitle={t.envelopes.loadError}
						onRetry={() => {
							for (const q of [envelopes, categories]) {
								if (q.isError) q.refetch()
							}
						}}
						isEmpty={envelopeRows?.length === 0}
						empty={t.envelopes.empty}
					>
						<ul className="flex flex-col gap-2">
							{envelopeRows?.map((status) => (
								<li
									key={status.envelope.id}
									className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
								>
									<span className="min-w-0 truncate font-medium text-foreground text-sm">
										{status.categoryName ?? translations.month.details.deleted}
									</span>
									<span className="shrink-0 text-foreground text-sm">
										${formatCad(status.allocated, { compact: true })}
									</span>
								</li>
							))}
						</ul>
					</ReviewSection>
				</div>

				<div className="flex shrink-0 flex-col gap-2 border-border border-t px-5 py-5">
					<Button
						type="button"
						onClick={done}
						disabled={saving || invalidIds.length > 0}
					>
						{t.done}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={saving}
					>
						{t.close}
					</Button>
				</div>
			</div>
		</DetailsSheet>
	)
}
