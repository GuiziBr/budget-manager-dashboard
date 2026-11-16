"use client"

import { DollarSign, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { DetailsField, DetailsSection } from "@/components/month/DetailsSheet"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { translations } from "@/constants/translations"
import {
	useInstallmentGroup,
	useUpdateInstallmentGroup
} from "@/hooks/use-installment-groups"
import { ApiError } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error-message"
import { formatFullDate } from "@/lib/format-date"
import {
	planChangeApplies,
	planChangeMessage,
	sameUtcMonth
} from "@/lib/installment-plan"
import {
	checkMoney,
	formatCad,
	formatMoneyInput,
	parseMoney
} from "@/lib/money"
import { installmentEndDate } from "@/lib/month-rows"
import type { Id } from "@/types"

interface InstallmentPlanDialogProps {
	planId: Id
	/** Closes the dialog (the address drops `?plan=`). */
	onClose: () => void
	/** The plan can't be read (gone, or not a plan id): the link is dropped. */
	onMissing: () => void
	/** Without it the plan is shown but its amount can't be changed. */
	canEdit: boolean
}

type Step = "view" | "amount" | "confirm"

const t = translations.month.plan
const details = translations.month.details

// A fixed id keeps repeated failures from stacking toasts
const SAVE_TOAST_ID = "plan-amount-failed"
const MISSING_TOAST_ID = "plan-missing"

/**
 * One installment plan: its details and the amount per payment (read from the
 * plan, since the expense doesn't carry it), with the flow to change that amount (M-19).
 */
export function InstallmentPlanDialog({
	planId,
	onClose,
	onMissing,
	canEdit
}: InstallmentPlanDialogProps) {
	const group = useInstallmentGroup(planId)
	const update = useUpdateInstallmentGroup()
	const [step, setStep] = useState<Step>("view")
	// When the confirmation was shown: the month it names must still be the current one on Save
	const [reviewedAt, setReviewedAt] = useState(() => new Date())
	const [text, setText] = useState("")
	const [touched, setTouched] = useState(false)

	// 404: the plan is gone. 400: the id isn't even a UUID
	const missing =
		group.isError &&
		group.error instanceof ApiError &&
		(group.error.status === 404 || group.error.status === 400)
	useEffect(() => {
		if (!missing) return
		toast.error(translations.errors.planGone, { id: MISSING_TOAST_ID })
		onMissing()
	}, [missing, onMissing])

	const plan = group.data
	const endDate = plan
		? installmentEndDate({
				firstPurchasedAt: plan.firstPurchasedAt,
				totalInstallments: plan.totalInstallments,
				paymentIntervalDays: plan.paymentIntervalDays
			})
		: null
	const applies = endDate ? planChangeApplies(endDate) : false
	const check = checkMoney(text)
	const amount = parseMoney(text)
	const invalid = touched && check !== "ok"

	const handleOpenChange = (next: boolean) => {
		if (update.isPending) return
		if (!next) onClose()
	}
	const review = () => {
		setTouched(true)
		if (amount === null) return
		setReviewedAt(new Date())
		setStep("confirm")
	}
	const save = () => {
		if (amount === null) return
		// The month rolled over (UTC) while the confirmation was open: the backend would
		// now change fewer payments than the text says, so show the new text and ask again
		const now = new Date()
		if (!sameUtcMonth(reviewedAt, now)) {
			setReviewedAt(now)
			if (endDate && !planChangeApplies(endDate, now)) setStep("view")
			return
		}
		update.mutate(
			{ id: planId, amountPerInstallment: amount },
			{
				onSuccess: (saved) => {
					toast.success(t.saved.replace("{item}", saved.description))
					onClose()
				},
				onError: (error) =>
					toast.error(
						getApiErrorMessage(error, { action: "changePlanAmount" }),
						{
							id: SAVE_TOAST_ID
						}
					)
			}
		)
	}

	return (
		<Dialog open onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{t.title}</DialogTitle>
					<DialogDescription className="pt-1">
						{plan?.description ?? t.description}
					</DialogDescription>
				</DialogHeader>

				{step === "view" && (
					<>
						<DetailsSection>
							<DetailsField label={t.amountPerPayment}>
								{group.isLoading ? (
									<Skeleton className="ml-auto h-4 w-20" />
								) : group.data ? (
									formatCad(group.data.amountPerInstallment)
								) : (
									details.none
								)}
							</DetailsField>
							<DetailsField label={t.payments}>
								{plan ? String(plan.totalInstallments) : details.none}
							</DetailsField>
							<DetailsField label={details.fields.interval}>
								{plan
									? details.intervalDays.replace(
											"{days}",
											String(plan.paymentIntervalDays)
										)
									: details.none}
							</DetailsField>
							<DetailsField label={details.fields.firstPurchase}>
								{(plan && formatFullDate(plan.firstPurchasedAt)) ??
									details.none}
							</DetailsField>
							<DetailsField label={details.fields.endDate}>
								{(endDate && formatFullDate(endDate)) ?? details.none}
							</DetailsField>
						</DetailsSection>
						{group.isError && (
							<p role="alert" className="text-danger text-sm">
								{t.loadFailed}{" "}
								<button
									type="button"
									className="underline"
									onClick={() => group.refetch()}
								>
									{t.retry}
								</button>
							</p>
						)}
						{canEdit && plan && !applies && (
							<p className="text-muted-foreground text-sm">{t.noEffect}</p>
						)}
						<DialogFooter>
							<Button variant="outline" onClick={() => handleOpenChange(false)}>
								{t.close}
							</Button>
							{canEdit && (
								<Button
									disabled={!applies || !group.data}
									onClick={() => setStep("amount")}
								>
									{t.changeAmount}
								</Button>
							)}
						</DialogFooter>
					</>
				)}

				{step === "amount" && (
					<form
						className="flex flex-col gap-4"
						onSubmit={(event) => {
							event.preventDefault()
							review()
						}}
					>
						<FormField
							id="plan-amount"
							label={t.newAmount}
							required
							error={
								invalid
									? check === "tooLarge"
										? t.tooLarge
										: t.invalid
									: undefined
							}
						>
							<Input
								id="plan-amount"
								autoFocus
								value={text}
								onChange={(event) =>
									setText(formatMoneyInput(event.target.value))
								}
								icon={DollarSign}
								inputMode="numeric"
								autoComplete="off"
								placeholder={t.placeholder}
								aria-required="true"
								aria-invalid={invalid}
								className={
									invalid
										? "border-danger focus-within:border-danger"
										: undefined
								}
							/>
						</FormField>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setStep("view")}
							>
								{t.back}
							</Button>
							<Button type="submit">{t.review}</Button>
						</DialogFooter>
					</form>
				)}

				{step === "confirm" && amount !== null && (
					<>
						<p className="text-foreground text-sm">
							{planChangeMessage(amount, reviewedAt)}
						</p>
						<DialogFooter>
							<Button
								variant="outline"
								disabled={update.isPending}
								onClick={() => setStep("amount")}
							>
								{t.back}
							</Button>
							<Button disabled={update.isPending} onClick={save}>
								{update.isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									t.save
								)}
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}
