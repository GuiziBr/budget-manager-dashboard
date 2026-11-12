"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { Check, DollarSign, Plus } from "lucide-react"
import { type RefObject, useEffect, useMemo, useRef } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { DetailsSheet } from "@/components/month/DetailsSheet"
import { Button } from "@/components/ui/button"
import { FormField, fieldErrorId } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { SelectMenu } from "@/components/ui/select-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { translations } from "@/constants/translations"
import { BANKS_QUERY_KEY, useBanks } from "@/hooks/use-banks"
import { CATEGORIES_QUERY_KEY, useCategories } from "@/hooks/use-categories"
import { useCreateExpense } from "@/hooks/use-expenses"
import {
	PAYMENT_TYPES_QUERY_KEY,
	usePaymentTypes
} from "@/hooks/use-payment-types"
import { STORES_QUERY_KEY, useStores } from "@/hooks/use-stores"
import { type ApiErrorField, describeApiError } from "@/lib/api-error-message"
import {
	afterAddAnother,
	buildCreateExpenseInput,
	createExpenseFormSchema,
	EMPTY_EXPENSE_FORM,
	type ExpenseFormValues
} from "@/lib/expense-form"
import { todayIso } from "@/lib/format-date"
import { formatMoneyInput } from "@/lib/money"
import type { Month } from "@/lib/month"
import { monthLabel } from "@/lib/month"
import type { Bank, Category, Id, PaymentType, Store } from "@/types"

const t = translations.month.form

// A fixed id keeps repeated failures from stacking toasts
const SAVE_FAILED_TOAST_ID = "expense-save-failed"

interface ExpenseFormPanelProps {
	open: boolean
	onClose: () => void
	periodId: Id
	month: Month
	/** An expense was saved: the table goes back to its first page. */
	onSaved?: () => void
	returnFocusRef?: RefObject<HTMLElement | null>
}

/** The form's field names for the fields an API error can point at. */
const FIELD_FOR_ERROR = {
	category: "categoryId",
	paymentType: "paymentTypeId",
	bank: "bankId",
	store: "storeId",
	purchasedAt: "purchasedAt"
} as const satisfies Record<ApiErrorField, keyof ExpenseFormValues>

/** The lists to refresh when a lookup turns out to be gone. */
const LOOKUP_KEYS: Partial<Record<ApiErrorField, readonly string[]>> = {
	category: CATEGORIES_QUERY_KEY,
	paymentType: PAYMENT_TYPES_QUERY_KEY,
	bank: BANKS_QUERY_KEY,
	store: STORES_QUERY_KEY
}

interface Lookups {
	categories: Category[]
	paymentTypes: PaymentType[]
	banks: Bank[]
	stores: Store[]
}

/**
 * Add an expense to the month on screen (M-14, M-26): a panel from the right on desktop,
 * a full-height sheet on the phone. One-time expenses only for now; installments and
 * recurring bills come with their own fields later.
 */
export function ExpenseFormPanel({
	open,
	onClose,
	periodId,
	month,
	onSaved,
	returnFocusRef
}: ExpenseFormPanelProps) {
	const label = monthLabel(month)

	return (
		<DetailsSheet
			open={open}
			onOpenChange={(next) => {
				if (!next) onClose()
			}}
			title={t.title}
			titleAside={
				<span className="text-muted-foreground text-sm">{label}</span>
			}
			separated
			titleClassName="text-xl"
			description={t.description.replace("{month}", label)}
			returnFocusRef={returnFocusRef}
			fullHeight
			initialFocus="#expense-description"
		>
			<ExpenseFormBody
				periodId={periodId}
				monthName={label}
				onClose={onClose}
				onSaved={onSaved}
			/>
		</DetailsSheet>
	)
}

function ExpenseFormBody({
	periodId,
	monthName,
	onClose,
	onSaved
}: {
	periodId: Id
	monthName: string
	onClose: () => void
	onSaved?: () => void
}) {
	const categories = useCategories()
	const paymentTypes = usePaymentTypes()
	const banks = useBanks()
	const stores = useStores()
	const queries = [categories, paymentTypes, banks, stores]

	if (queries.some((query) => query.isError)) {
		return (
			<div
				role="alert"
				className="mx-5 flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4"
			>
				<p className="font-medium text-foreground text-sm">{t.loadError}</p>
				<Button
					variant="outline"
					onClick={() => {
						for (const query of queries) if (query.isError) query.refetch()
					}}
				>
					{t.retry}
				</Button>
			</div>
		)
	}

	if (!categories.data || !paymentTypes.data || !banks.data || !stores.data) {
		return (
			<div
				role="status"
				aria-label={t.loading}
				className="flex flex-col gap-4 px-5"
			>
				{["description", "pair", "pair-2", "amount"].map((key) => (
					<Skeleton key={key} className="h-10 w-full" />
				))}
			</div>
		)
	}

	return (
		<ExpenseForm
			lookups={{
				categories: categories.data,
				paymentTypes: paymentTypes.data,
				banks: banks.data,
				stores: stores.data
			}}
			periodId={periodId}
			monthName={monthName}
			onClose={onClose}
			onSaved={onSaved}
		/>
	)
}

type Submit = "close" | "another"

function ExpenseForm({
	lookups,
	periodId,
	monthName,
	onClose,
	onSaved
}: {
	lookups: Lookups
	periodId: Id
	monthName: string
	onClose: () => void
	onSaved?: () => void
}) {
	const queryClient = useQueryClient()
	const createExpense = useCreateExpense()

	// The latest purchase date allowed, fixed while the form is open
	const today = useRef(todayIso()).current
	const schema = useMemo(
		() =>
			createExpenseFormSchema(
				(id) =>
					lookups.paymentTypes.find((type) => type.id === id)?.hasStatement ??
					false,
				today
			),
		[lookups.paymentTypes, today]
	)
	const {
		register,
		control,
		handleSubmit,
		reset,
		setError,
		setFocus,
		trigger,
		watch,
		formState: { errors, isSubmitted, isSubmitting }
	} = useForm<ExpenseFormValues>({
		resolver: zodResolver(schema),
		defaultValues: EMPTY_EXPENSE_FORM
	})

	// The fields appear after the lists load, which can be after the panel took the focus
	useEffect(() => {
		setFocus("description")
	}, [setFocus])

	const paymentTypeId = watch("paymentTypeId")
	const bankRequired =
		lookups.paymentTypes.find((type) => type.id === paymentTypeId)
			?.hasStatement ?? false

	const save = (then: Submit) =>
		handleSubmit(async (values) => {
			try {
				await createExpense.mutateAsync(
					buildCreateExpenseInput(values, periodId)
				)
			} catch (error) {
				const problem = describeApiError(error, { action: "saveExpense" })
				if (problem.field) {
					setError(FIELD_FOR_ERROR[problem.field], {
						message: problem.message
					})
					// A lookup that is gone: refresh the lists so the choice disappears
					const key = LOOKUP_KEYS[problem.field]
					if (problem.kind === "lookupGone" && key) {
						queryClient.invalidateQueries({ queryKey: key })
					}
					// The field only gets a red border, so say what went wrong
					toast.error(problem.message, { id: SAVE_FAILED_TOAST_ID })
				} else {
					toast.error(problem.message, { id: SAVE_FAILED_TOAST_ID })
				}
				return
			}
			toast.success(
				translations.month.form.saved
					.replace("{item}", values.description.trim())
					.replace("{month}", monthName)
			)
			onSaved?.()
			if (then === "close") {
				onClose()
				return
			}
			reset(afterAddAnother(values))
			// reset drops the field references until the next render
			setTimeout(() => setFocus("description"), 0)
		})

	const busy = isSubmitting
	const describedBy = (id: string, hasError: boolean) =>
		hasError ? fieldErrorId(id) : undefined

	return (
		<form
			noValidate
			onSubmit={save("close")}
			className="flex min-h-0 flex-1 flex-col"
		>
			<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
				<FormField
					id="expense-description"
					label={t.fields.description}
					required
					error={errors.description?.message}
				>
					<Input
						id="expense-description"
						autoComplete="off"
						placeholder={t.placeholders.description}
						aria-required="true"
						aria-invalid={!!errors.description}
						aria-describedby={describedBy(
							"expense-description",
							!!errors.description
						)}
						className={
							errors.description
								? "border-danger focus-within:border-danger"
								: undefined
						}
						{...register("description")}
					/>
				</FormField>

				<div className="grid grid-cols-2 gap-3">
					<FormField
						id="expense-category"
						label={t.fields.category}
						required
						error={errors.categoryId?.message}
					>
						<Controller
							control={control}
							name="categoryId"
							render={({ field }) => (
								<SelectMenu
									id="expense-category"
									ref={field.ref}
									name={field.name}
									options={lookups.categories}
									value={field.value}
									onValueChange={field.onChange}
									onBlur={field.onBlur}
									placeholder={t.placeholders.category}
									invalid={!!errors.categoryId}
								/>
							)}
						/>
					</FormField>
					<FormField
						id="expense-payment-type"
						label={t.fields.paymentType}
						required
						error={errors.paymentTypeId?.message}
					>
						<Controller
							control={control}
							name="paymentTypeId"
							render={({ field }) => (
								<SelectMenu
									id="expense-payment-type"
									ref={field.ref}
									name={field.name}
									options={lookups.paymentTypes}
									value={field.value}
									onValueChange={(value) => {
										field.onChange(value)
										// The bank's requirement follows the payment type
										if (isSubmitted) trigger("bankId")
									}}
									onBlur={field.onBlur}
									placeholder={t.placeholders.paymentType}
									invalid={!!errors.paymentTypeId}
								/>
							)}
						/>
					</FormField>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<FormField
						id="expense-bank"
						label={t.fields.bank}
						required={bankRequired}
						error={errors.bankId?.message}
					>
						<Controller
							control={control}
							name="bankId"
							render={({ field }) => (
								<SelectMenu
									id="expense-bank"
									ref={field.ref}
									name={field.name}
									options={lookups.banks}
									value={field.value}
									onValueChange={field.onChange}
									onBlur={field.onBlur}
									placeholder={t.placeholders.bank}
									clearLabel={bankRequired ? undefined : t.none}
									invalid={!!errors.bankId}
								/>
							)}
						/>
					</FormField>
					<FormField
						id="expense-store"
						label={t.fields.store}
						error={errors.storeId?.message}
					>
						<Controller
							control={control}
							name="storeId"
							render={({ field }) => (
								<SelectMenu
									id="expense-store"
									ref={field.ref}
									name={field.name}
									options={lookups.stores}
									value={field.value}
									onValueChange={field.onChange}
									onBlur={field.onBlur}
									placeholder={t.placeholders.store}
									clearLabel={t.none}
									invalid={!!errors.storeId}
								/>
							)}
						/>
					</FormField>
				</div>

				<FormField
					id="expense-amount"
					label={t.fields.amount}
					required
					error={errors.amount?.message}
				>
					<Controller
						control={control}
						name="amount"
						render={({ field }) => (
							<Input
								id="expense-amount"
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
								aria-describedby={describedBy(
									"expense-amount",
									!!errors.amount
								)}
								className={
									errors.amount
										? "border-danger focus-within:border-danger"
										: undefined
								}
							/>
						)}
					/>
				</FormField>

				<div className="grid grid-cols-2 gap-3">
					<FormField
						id="expense-purchased"
						label={t.fields.purchased}
						error={errors.purchasedAt?.message}
					>
						<Input
							id="expense-purchased"
							type="date"
							max={today}
							aria-invalid={!!errors.purchasedAt}
							aria-describedby={describedBy(
								"expense-purchased",
								!!errors.purchasedAt
							)}
							className={
								errors.purchasedAt
									? "border-danger focus-within:border-danger"
									: undefined
							}
							{...register("purchasedAt")}
						/>
					</FormField>
					<FormField id="expense-due" label={t.fields.due}>
						<Input id="expense-due" type="date" {...register("dueAt")} />
					</FormField>
				</div>
				<FormField id="expense-paid" label={t.fields.paid}>
					<Input id="expense-paid" type="date" {...register("paidAt")} />
				</FormField>
			</div>

			<div className="flex shrink-0 flex-col gap-2 border-border border-t px-5 py-5">
				<Button type="submit" disabled={busy}>
					<Check className="size-4" aria-hidden="true" />
					{t.finishClose}
				</Button>
				<Button
					type="button"
					variant="outline"
					disabled={busy}
					onClick={save("another")}
				>
					<Plus className="size-4" aria-hidden="true" />
					{t.finishAddAnother}
				</Button>
				<Button type="button" variant="outline" onClick={onClose}>
					{t.cancel}
				</Button>
			</div>
		</form>
	)
}
