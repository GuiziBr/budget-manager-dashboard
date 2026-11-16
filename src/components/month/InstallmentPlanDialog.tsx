"use client"

import { DollarSign, Loader2 } from "lucide-react"
import { useState } from "react"
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
import { getApiErrorMessage } from "@/lib/api-error-message"
import { formatFullDate } from "@/lib/format-date"
import { planChangeApplies, planChangeMessage } from "@/lib/installment-plan"
import {
	checkMoney,
	formatCad,
	formatMoneyInput,
	parseMoney
} from "@/lib/money"
import { type RowInstallment, rowInstallmentEndDate } from "@/lib/month-rows"
import type { Id } from "@/types"

interface InstallmentPlanDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	planId: Id
	description: string
	installment: RowInstallment
	/** Without it the plan is shown but its amount can't be changed. */
	canEdit: boolean
}

type Step = "view" | "amount" | "confirm"

const t = translations.month.plan
const details = translations.month.details

// A fixed id keeps repeated failures from stacking toasts
const SAVE_TOAST_ID = "plan-amount-failed"

/**
 * One installment plan: its details and the amount per payment (read from the
 * plan, since the expense doesn't carry it), with the flow to change that amount (M-19).
 */
export function InstallmentPlanDialog({
	open,
	onOpenChange,
	planId,
	description,
	installment,
	canEdit
}: InstallmentPlanDialogProps) {
	const group = useInstallmentGroup(open ? planId : undefined)
	const update = useUpdateInstallmentGroup()
	const [step, setStep] = useState<Step>("view")
	const [text, setText] = useState("")
	const [touched, setTouched] = useState(false)

	const endDate = rowInstallmentEndDate(installment)
	const applies = planChangeApplies(endDate)
	const check = checkMoney(text)
	const amount = parseMoney(text)
	const invalid = touched && check !== "ok"

	const reset = () => {
		setStep("view")
		setText("")
		setTouched(false)
	}
	const handleOpenChange = (next: boolean) => {
		if (update.isPending) return
		if (!next) reset()
		onOpenChange(next)
	}
	const review = () => {
		setTouched(true)
		if (amount !== null) setStep("confirm")
	}
	const save = () => {
		if (amount === null) return
		update.mutate(
			{ id: planId, amountPerInstallment: amount },
			{
				onSuccess: () => {
					toast.success(t.saved.replace("{item}", description))
					reset()
					onOpenChange(false)
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
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{t.title}</DialogTitle>
					<DialogDescription className="pt-1">{description}</DialogDescription>
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
							<DetailsField label={details.fields.payment}>
								{details.installmentProgress
									.replace(
										"{n}",
										installment.number === null
											? details.none
											: String(installment.number)
									)
									.replace("{total}", String(installment.total))}
							</DetailsField>
							<DetailsField label={details.fields.interval}>
								{details.intervalDays.replace(
									"{days}",
									String(installment.paymentIntervalDays)
								)}
							</DetailsField>
							<DetailsField label={details.fields.firstPurchase}>
								{formatFullDate(installment.firstPurchasedAt) ?? details.none}
							</DetailsField>
							<DetailsField label={details.fields.endDate}>
								{formatFullDate(endDate) ?? details.none}
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
						{canEdit && !applies && (
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
							{planChangeMessage(amount)}
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
