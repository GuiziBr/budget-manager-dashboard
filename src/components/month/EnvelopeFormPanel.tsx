"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { DollarSign } from "lucide-react"
import { type RefObject, useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { DetailsSheet } from "@/components/month/DetailsSheet"
import { Button } from "@/components/ui/button"
import { FormField, fieldErrorId } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { SelectMenu } from "@/components/ui/select-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { translations } from "@/constants/translations"
import {
	BUDGET_ENVELOPES_QUERY_KEY,
	useCreateEnvelope,
	useMonthEnvelopes,
	useUpdateEnvelope
} from "@/hooks/use-budget-envelopes"
import { useCategories } from "@/hooks/use-categories"
import { ApiError } from "@/lib/api"
import { getApiErrorMessage, isMonthClosedError } from "@/lib/api-error-message"
import {
	availableEnvelopeCategories,
	buildCreateEnvelopeInput,
	buildUpdateEnvelopeInput,
	EMPTY_ENVELOPE_FORM,
	type EnvelopeFormValues,
	envelopeFormSchema,
	envelopeToFormValues
} from "@/lib/envelope-form"
import { formatCad, formatMoneyInput } from "@/lib/money"
import { type Month, monthLabel } from "@/lib/month"
import type { BudgetEnvelope, Id } from "@/types"

const t = translations.month.envelopes.form

// A fixed id keeps repeated failures from stacking toasts
const SAVE_FAILED_TOAST_ID = "envelope-save-failed"

interface EnvelopeFormPanelProps {
	open: boolean
	onClose: () => void
	periodId: Id
	month: Month
	/** The envelope whose budget is edited. Without it the panel adds an envelope (M-23); with it, edits the budget (M-22). */
	envelope?: BudgetEnvelope | null
	/** The budget was saved, or left as it was (before the panel closes). Called with `null` for a new envelope. */
	onSaved?: (envelope: BudgetEnvelope | null) => void
	returnFocusRef?: RefObject<HTMLElement | null>
}

/**
 * Add an envelope or change one's budget (M-22, M-23): a panel from the right on desktop,
 * a full-height sheet on the phone. Same shell and conventions as the income form.
 */
export function EnvelopeFormPanel({
	open,
	onClose,
	periodId,
	month,
	envelope,
	onSaved,
	returnFocusRef
}: EnvelopeFormPanelProps) {
	const label = monthLabel(month)
	const editing = !!envelope
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
			initialFocus={editing ? "#envelope-amount" : "#envelope-category"}
		>
			<EnvelopeForm
				// The sheet stays mounted while it closes, and the form reads its defaults only on
				// mount: a new key gives each envelope (or Add) a fresh form
				key={envelope?.id ?? "new"}
				envelope={envelope ?? undefined}
				periodId={periodId}
				monthName={label}
				onClose={onClose}
				onSaved={onSaved}
				onSavingChange={setSaving}
			/>
		</DetailsSheet>
	)
}

function EnvelopeForm({
	envelope,
	periodId,
	monthName,
	onClose,
	onSaved,
	onSavingChange
}: {
	envelope?: BudgetEnvelope
	periodId: Id
	monthName: string
	onClose: () => void
	onSaved?: (envelope: BudgetEnvelope | null) => void
	onSavingChange: (saving: boolean) => void
}) {
	const queryClient = useQueryClient()
	const categories = useCategories()
	const envelopes = useMonthEnvelopes(periodId)
	const createEnvelope = useCreateEnvelope()
	const updateEnvelope = useUpdateEnvelope()
	const {
		control,
		handleSubmit,
		setFocus,
		formState: { errors, isSubmitting }
	} = useForm<EnvelopeFormValues>({
		resolver: zodResolver(envelopeFormSchema),
		defaultValues: envelope
			? envelopeToFormValues(envelope)
			: EMPTY_ENVELOPE_FORM
	})

	const ready = !!categories.data && !!envelopes.data
	const failed = categories.isError || envelopes.isError
	const options = useMemo(
		() =>
			availableEnvelopeCategories(categories.data ?? [], envelopes.data ?? []),
		[categories.data, envelopes.data]
	)
	const categoryName = (id: string) =>
		categories.data?.find((category) => category.id === id)?.name ??
		translations.month.details.deleted

	useEffect(() => {
		if (ready) setFocus(envelope ? "amount" : "categoryId")
	}, [ready, envelope, setFocus])

	const busy = isSubmitting
	// Tells the panel to hold off dismissal (Close, Escape, outside click) during a save
	useEffect(() => {
		onSavingChange(busy)
		return () => onSavingChange(false)
	}, [busy, onSavingChange])

	const save = handleSubmit(async (values) => {
		const name = categoryName(values.categoryId)
		try {
			if (envelope) {
				const input = buildUpdateEnvelopeInput(values, envelope)
				// Nothing changed: the API rejects an empty body, so there is nothing to send
				if (!input) {
					// Still counts as done: the details come back like after a change
					onSaved?.(envelope)
					onClose()
					return
				}
				await updateEnvelope.mutateAsync({ id: envelope.id, ...input })
				toast.success(t.savedEdit.replace("{category}", name))
			} else {
				await createEnvelope.mutateAsync(
					buildCreateEnvelopeInput(values, periodId)
				)
				toast.success(
					t.saved.replace("{category}", name).replace("{month}", monthName)
				)
			}
		} catch (error) {
			// Someone else added or removed it meanwhile, or the month ended while the form
			// was open: refresh so the options and tiles are right
			if (
				(error instanceof ApiError &&
					(error.status === 409 || error.status === 404)) ||
				isMonthClosedError(error)
			) {
				queryClient.invalidateQueries({ queryKey: BUDGET_ENVELOPES_QUERY_KEY })
			}
			// The fields keep what was typed; the toast says what went wrong
			toast.error(
				getApiErrorMessage(
					error,
					envelope
						? { action: "updateEnvelope" }
						: { action: "createEnvelope", category: name }
				),
				{ id: SAVE_FAILED_TOAST_ID }
			)
			return
		}
		onSaved?.(envelope ?? null)
		onClose()
	})

	const describedBy = (id: string, hasError: boolean) =>
		hasError ? fieldErrorId(id) : undefined
	const invalid = "border-danger focus-within:border-danger"
	const spent = envelope?.spentAmount

	return (
		<form noValidate onSubmit={save} className="flex min-h-0 flex-1 flex-col">
			<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
				{failed && (
					<div role="alert" className="flex flex-col items-start gap-2">
						<p className="text-muted-foreground text-sm">{t.loadError}</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								categories.refetch()
								envelopes.refetch()
							}}
						>
							{t.retry}
						</Button>
					</div>
				)}
				{!failed && !ready && (
					<div
						role="status"
						aria-label={t.loading}
						className="flex flex-col gap-4"
					>
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-9 w-full" />
					</div>
				)}
				{ready && (
					<>
						<FormField
							id="envelope-category"
							label={t.fields.category}
							required={!envelope}
							error={errors.categoryId?.message}
						>
							{envelope ? (
								// Text, not a disabled control, so screen readers still read it
								<p
									id="envelope-category"
									className="flex h-10 items-center rounded-lg border border-input bg-muted px-3 font-medium text-foreground text-sm"
								>
									{categoryName(envelope.categoryId)}
								</p>
							) : (
								<Controller
									control={control}
									name="categoryId"
									render={({ field }) => (
										<SelectMenu
											id="envelope-category"
											ref={field.ref}
											name={field.name}
											options={options}
											value={field.value}
											onValueChange={field.onChange}
											onBlur={field.onBlur}
											placeholder={t.placeholders.category}
											invalid={!!errors.categoryId}
											aria-describedby={describedBy(
												"envelope-category",
												!!errors.categoryId
											)}
										/>
									)}
								/>
							)}
						</FormField>

						<FormField
							id="envelope-amount"
							label={t.fields.budget}
							required
							error={errors.amount?.message}
						>
							<Controller
								control={control}
								name="amount"
								render={({ field }) => (
									<Input
										id="envelope-amount"
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
										placeholder={t.placeholders.budget}
										aria-required="true"
										aria-invalid={!!errors.amount}
										aria-describedby={describedBy(
											"envelope-amount",
											!!errors.amount
										)}
										className={errors.amount ? invalid : undefined}
									/>
								)}
							/>
							{typeof spent === "number" && (
								<p className="text-muted-foreground text-xs">
									{t.spentHint.replace("{amount}", formatCad(spent))}
								</p>
							)}
						</FormField>
					</>
				)}
			</div>

			<div className="flex shrink-0 flex-col gap-2 border-border border-t px-5 py-5">
				<Button type="submit" disabled={busy || !ready}>
					{t.save}
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
