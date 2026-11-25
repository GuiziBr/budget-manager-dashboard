"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { DollarSign } from "lucide-react"
import { type RefObject, useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { DetailsSheet } from "@/components/DetailsSheet"
import { Button } from "@/components/ui/button"
import { FormField, fieldErrorId } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { translations } from "@/constants/translations"
import { useCreateIncome, useUpdateIncome } from "@/hooks/use-incomes"
import { getApiErrorMessage } from "@/lib/api-error-message"
import {
	buildCreateIncomeInput,
	buildUpdateIncomeInput,
	EMPTY_INCOME_FORM,
	type IncomeFormValues,
	incomeFormSchema,
	incomeToFormValues
} from "@/lib/income-form"
import { formatMoneyInput } from "@/lib/money"
import { type Month, monthLabel } from "@/lib/month"
import type { Id, Income } from "@/types"

const t = translations.month.income.form

// A fixed id keeps repeated failures from stacking toasts
const SAVE_FAILED_TOAST_ID = "income-save-failed"

interface IncomeFormPanelProps {
	open: boolean
	onClose: () => void
	periodId: Id
	month: Month
	/** The income to edit. Without it the panel adds an income (M-20); with it, edits that one (M-21). */
	income?: Income | null
	/** An income was saved (before the panel closes). */
	onSaved?: () => void
	returnFocusRef?: RefObject<HTMLElement | null>
}

/**
 * Add or edit an income of the month on screen (M-20, M-21): a panel from the right on
 * desktop, a full-height sheet on the phone. Same shell and conventions as the expense form.
 */
export function IncomeFormPanel({
	open,
	onClose,
	periodId,
	month,
	income,
	onSaved,
	returnFocusRef
}: IncomeFormPanelProps) {
	const label = monthLabel(month)
	const editing = !!income
	// While a save is in flight the panel stays, so the user sees whether it worked
	const [saving, setSaving] = useState(false)

	return (
		<DetailsSheet
			open={open}
			onOpenChange={(next) => {
				if (!next && !saving) onClose()
			}}
			title={editing ? t.editTitle : t.title}
			titleAside={
				<span className="text-muted-foreground text-sm">{label}</span>
			}
			separated
			titleClassName="text-xl"
			description={(editing ? t.editDescription : t.description).replace(
				"{month}",
				label
			)}
			returnFocusRef={returnFocusRef}
			fullHeight
			initialFocus="#income-description"
		>
			<IncomeForm
				// The sheet stays mounted while it closes, and the form reads its defaults only on
				// mount: a new key gives each income (or Add) a fresh form
				key={income?.id ?? "new"}
				income={income ?? undefined}
				periodId={periodId}
				monthName={label}
				onClose={onClose}
				onSaved={onSaved}
				onSavingChange={setSaving}
			/>
		</DetailsSheet>
	)
}

function IncomeForm({
	income,
	periodId,
	monthName,
	onClose,
	onSaved,
	onSavingChange
}: {
	income?: Income
	periodId: Id
	monthName: string
	onClose: () => void
	onSaved?: () => void
	onSavingChange: (saving: boolean) => void
}) {
	const createIncome = useCreateIncome()
	const updateIncome = useUpdateIncome()
	const {
		register,
		control,
		handleSubmit,
		setFocus,
		formState: { errors, isSubmitting }
	} = useForm<IncomeFormValues>({
		resolver: zodResolver(incomeFormSchema),
		defaultValues: income ? incomeToFormValues(income) : EMPTY_INCOME_FORM
	})

	useEffect(() => {
		setFocus("description")
	}, [setFocus])

	const busy = isSubmitting
	// Tells the panel to hold off dismissal (Close, Escape, outside click) during a save
	useEffect(() => {
		onSavingChange(busy)
		return () => onSavingChange(false)
	}, [busy, onSavingChange])

	const save = handleSubmit(async (values) => {
		const item = values.description.trim()
		try {
			if (income) {
				const input = buildUpdateIncomeInput(values, income)
				// Nothing changed: the API rejects an empty body, so there is nothing to send
				if (!input) {
					onClose()
					return
				}
				await updateIncome.mutateAsync({ id: income.id, ...input })
				toast.success(t.savedEdit.replace("{item}", item))
			} else {
				await createIncome.mutateAsync(buildCreateIncomeInput(values, periodId))
				toast.success(
					t.saved.replace("{item}", item).replace("{month}", monthName)
				)
			}
		} catch (error) {
			// The fields keep what was typed; the toast says what went wrong
			toast.error(getApiErrorMessage(error, { action: "mutate" }), {
				id: SAVE_FAILED_TOAST_ID
			})
			return
		}
		onSaved?.()
		onClose()
	})

	const describedBy = (id: string, hasError: boolean) =>
		hasError ? fieldErrorId(id) : undefined
	const invalid = "border-danger focus-within:border-danger"

	return (
		<form noValidate onSubmit={save} className="flex min-h-0 flex-1 flex-col">
			<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
				<FormField
					id="income-description"
					label={t.fields.description}
					required
					error={errors.description?.message}
				>
					<Input
						id="income-description"
						autoComplete="off"
						placeholder={t.placeholders.description}
						aria-required="true"
						aria-invalid={!!errors.description}
						aria-describedby={describedBy(
							"income-description",
							!!errors.description
						)}
						className={errors.description ? invalid : undefined}
						{...register("description")}
					/>
				</FormField>

				<FormField
					id="income-amount"
					label={t.fields.amount}
					required
					error={errors.amount?.message}
				>
					<Controller
						control={control}
						name="amount"
						render={({ field }) => (
							<Input
								id="income-amount"
								ref={field.ref}
								name={field.name}
								value={field.value}
								// The digits fill in from the cents: 10050 reads 100.50
								onChange={(event) =>
									field.onChange(formatMoneyInput(event.target.value))
								}
								onBlur={field.onBlur}
								icon={DollarSign}
								inputMode="numeric"
								autoComplete="off"
								placeholder={t.placeholders.amount}
								aria-required="true"
								aria-invalid={!!errors.amount}
								aria-describedby={describedBy("income-amount", !!errors.amount)}
								className={errors.amount ? invalid : undefined}
							/>
						)}
					/>
				</FormField>

				<div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
					<div className="flex min-w-0 flex-col">
						<label
							htmlFor="income-salary"
							className="font-medium text-foreground text-sm"
						>
							{t.fields.salary}
						</label>
						<span className="text-muted-foreground text-xs">
							{t.salaryHint}
						</span>
					</div>
					<Controller
						control={control}
						name="isSalary"
						render={({ field }) => (
							<Switch
								id="income-salary"
								ref={field.ref}
								checked={field.value}
								onCheckedChange={field.onChange}
								onBlur={field.onBlur}
							/>
						)}
					/>
				</div>

				<FormField id="income-received" label={t.fields.received}>
					<Input id="income-received" type="date" {...register("receivedAt")} />
				</FormField>
			</div>

			<div className="flex shrink-0 flex-col gap-2 border-border border-t px-5 py-5">
				<Button type="submit" disabled={busy}>
					{income ? t.save : t.finish}
				</Button>
				<Button
					type="button"
					variant="outline"
					disabled={busy}
					onClick={onClose}
				>
					{t.cancel}
				</Button>
			</div>
		</form>
	)
}
