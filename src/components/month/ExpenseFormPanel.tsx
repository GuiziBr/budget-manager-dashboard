"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { Check, DollarSign, Plus } from "lucide-react"
import { type RefObject, useEffect, useMemo, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { DetailsSheet } from "@/components/month/DetailsSheet"
import { Button } from "@/components/ui/button"
import { FormField, fieldErrorId } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { SelectMenu } from "@/components/ui/select-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { translations } from "@/constants/translations"
import { BANKS_QUERY_KEY, useBanks } from "@/hooks/use-banks"
import { useBudgetPeriods } from "@/hooks/use-budget-periods"
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
	type ExpenseFormValues,
	type FormExpenseType,
	parsePlan
} from "@/lib/expense-form"
import { todayIso } from "@/lib/format-date"
import {
	MAX_PAYMENTS,
	planDueDates,
	planPlacement,
	planSummary,
	planToast
} from "@/lib/installment-plan"
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

/** The purchase date error belongs to the first purchase date on a plan. */
function errorField(
	field: ApiErrorField,
	type: FormExpenseType
): keyof ExpenseFormValues {
	return field === "purchasedAt" && type === "installment"
		? "firstPurchasedAt"
		: FIELD_FOR_ERROR[field]
}

const INTERVAL_OPTIONS = [
	{ id: "30", name: t.plan.monthly },
	{ id: "14", name: t.plan.biweekly },
	{ id: "custom", name: t.plan.custom }
]

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
 * a full-height sheet on the phone. A type control switches between one-time expenses,
 * installment plans (M-15) and recurring bills (M-16).
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
	// While a save is in flight, the panel stays: closing it would leave the request
	// running with nothing on screen to say whether it worked
	const [saving, setSaving] = useState(false)

	return (
		<DetailsSheet
			open={open}
			onOpenChange={(next) => {
				if (!next && !saving) onClose()
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
				month={month}
				monthName={label}
				onClose={onClose}
				onSaved={onSaved}
				onSavingChange={setSaving}
			/>
		</DetailsSheet>
	)
}

function ExpenseFormBody({
	periodId,
	month,
	monthName,
	onClose,
	onSaved,
	onSavingChange
}: {
	periodId: Id
	month: Month
	monthName: string
	onClose: () => void
	onSaved?: () => void
	onSavingChange: (saving: boolean) => void
}) {
	const categories = useCategories()
	const paymentTypes = usePaymentTypes()
	const banks = useBanks()
	const stores = useStores()
	const queries = [categories, paymentTypes, banks, stores]

	// A failed refetch keeps the earlier lists, so only a list that never loaded blocks the form
	// (swapping the form out would throw away what the user typed)
	const failed = queries.filter((query) => query.isError && !query.data)
	if (failed.length > 0) {
		return (
			<div
				role="alert"
				className="mx-5 flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4"
			>
				<p className="font-medium text-foreground text-sm">{t.loadError}</p>
				<Button
					variant="outline"
					onClick={() => {
						for (const query of failed) query.refetch()
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
			month={month}
			monthName={monthName}
			onClose={onClose}
			onSaved={onSaved}
			onSavingChange={onSavingChange}
		/>
	)
}

type Submit = "close" | "another"

function ExpenseForm({
	lookups,
	periodId,
	month,
	monthName,
	onClose,
	onSaved,
	onSavingChange
}: {
	lookups: Lookups
	periodId: Id
	month: Month
	monthName: string
	onClose: () => void
	onSaved?: () => void
	onSavingChange: (saving: boolean) => void
}) {
	const queryClient = useQueryClient()
	const createExpense = useCreateExpense()
	const periods = useBudgetPeriods()

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

	const type = watch("type")
	const isPlan = type === "installment"
	const isRecurring = type === "recurring"
	const paymentTypeId = watch("paymentTypeId")
	const planValues = watch([
		"amount",
		"installmentCount",
		"intervalPreset",
		"customIntervalDays",
		"firstPurchasedAt"
	])
	const intervalPreset = planValues[2]
	const summary = (() => {
		if (!isPlan) return ""
		const plan = parsePlan({
			...EMPTY_EXPENSE_FORM,
			amount: planValues[0],
			installmentCount: planValues[1],
			intervalPreset,
			customIntervalDays: planValues[3],
			firstPurchasedAt: planValues[4]
		})
		return plan && plan.firstPurchasedAt <= today && plan.count <= MAX_PAYMENTS
			? planSummary(plan)
			: ""
	})()
	const bankRequired =
		lookups.paymentTypes.find((type) => type.id === paymentTypeId)
			?.hasStatement ?? false

	const save = (then: Submit) =>
		handleSubmit(async (values) => {
			// Where the payments go, from the opened months we know about
			const plan = values.type === "installment" ? parsePlan(values) : null
			const dueDates = plan
				? planDueDates(plan.firstPurchasedAt, plan.count, plan.intervalDays)
				: []
			const placeIn = (known: typeof periods.data) =>
				plan && known ? planPlacement(dueDates, known, month) : null
			let placement = placeIn(periods.data)
			if (placement && placement.created === 0) {
				// The list may be stale (a month opened elsewhere): ask again before
				// deciding. If that fails, let the server decide
				const fresh = await periods.refetch()
				placement = fresh.isError ? null : placeIn(fresh.data)
				if (placement && placement.created === 0) {
					setError("firstPurchasedAt", {
						message: translations.errors.noPeriodForInstallments
					})
					toast.error(translations.errors.noPeriodForInstallments, {
						id: SAVE_FAILED_TOAST_ID
					})
					return
				}
			}
			try {
				await createExpense.mutateAsync(
					buildCreateExpenseInput(values, periodId)
				)
			} catch (error) {
				const problem = describeApiError(error, { action: "saveExpense" })
				if (problem.kind === "noPeriodForInstallments") {
					setError("firstPurchasedAt", { message: problem.message })
					toast.error(problem.message, { id: SAVE_FAILED_TOAST_ID })
				} else if (problem.field) {
					setError(errorField(problem.field, values.type), {
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
			const item = values.description.trim()
			// A plan is placed by its dates, so without them don't claim a month
			const fallback =
				values.type === "installment"
					? t.plan.savedUnplaced.replace("{item}", item)
					: t.saved.replace("{item}", item).replace("{month}", monthName)
			toast.success((placement && planToast(placement, monthName)) ?? fallback)
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
	// Tells the panel to hold off dismissal (Close, Escape, outside click) during a save
	useEffect(() => {
		onSavingChange(busy)
		return () => onSavingChange(false)
	}, [busy, onSavingChange])
	const describedBy = (id: string, hasError: boolean) =>
		hasError ? fieldErrorId(id) : undefined

	return (
		<form
			noValidate
			onSubmit={save("close")}
			className="flex min-h-0 flex-1 flex-col"
		>
			<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
				<Controller
					control={control}
					name="type"
					render={({ field }) => (
						<Tabs
							value={field.value}
							onValueChange={field.onChange}
							className="gap-0"
						>
							<TabsList aria-label={t.typeLabel}>
								<TabsTrigger value="one-time">{t.types.oneTime}</TabsTrigger>
								<TabsTrigger value="installment">
									{t.types.installment}
								</TabsTrigger>
								<TabsTrigger value="recurring">{t.types.recurring}</TabsTrigger>
							</TabsList>
						</Tabs>
					)}
				/>
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
									aria-describedby={describedBy(
										"expense-category",
										!!errors.categoryId
									)}
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
									aria-describedby={describedBy(
										"expense-payment-type",
										!!errors.paymentTypeId
									)}
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
									aria-describedby={describedBy(
										"expense-bank",
										!!errors.bankId
									)}
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
									aria-describedby={describedBy(
										"expense-store",
										!!errors.storeId
									)}
								/>
							)}
						/>
					</FormField>
				</div>

				<FormField
					id="expense-amount"
					label={isPlan ? t.plan.amountPerPayment : t.fields.amount}
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

				{isPlan ? (
					<>
						<div className="grid grid-cols-2 gap-3">
							<FormField
								id="expense-count"
								label={t.plan.count}
								required
								error={errors.installmentCount?.message}
							>
								<Input
									id="expense-count"
									inputMode="numeric"
									maxLength={3}
									autoComplete="off"
									placeholder={t.plan.countPlaceholder}
									aria-required="true"
									aria-invalid={!!errors.installmentCount}
									aria-describedby={describedBy(
										"expense-count",
										!!errors.installmentCount
									)}
									className={
										errors.installmentCount
											? "border-danger focus-within:border-danger"
											: undefined
									}
									{...register("installmentCount")}
								/>
							</FormField>
							<FormField id="expense-interval" label={t.plan.interval} required>
								<Controller
									control={control}
									name="intervalPreset"
									render={({ field }) => (
										<SelectMenu
											id="expense-interval"
											ref={field.ref}
											name={field.name}
											options={INTERVAL_OPTIONS}
											value={field.value}
											onValueChange={field.onChange}
											onBlur={field.onBlur}
										/>
									)}
								/>
							</FormField>
						</div>
						{intervalPreset === "custom" && (
							<FormField
								id="expense-custom-days"
								label={t.plan.customDays}
								required
								error={errors.customIntervalDays?.message}
							>
								<Input
									id="expense-custom-days"
									inputMode="numeric"
									maxLength={4}
									autoComplete="off"
									placeholder={t.plan.daysPlaceholder}
									aria-required="true"
									aria-invalid={!!errors.customIntervalDays}
									aria-describedby={describedBy(
										"expense-custom-days",
										!!errors.customIntervalDays
									)}
									className={
										errors.customIntervalDays
											? "border-danger focus-within:border-danger"
											: undefined
									}
									{...register("customIntervalDays")}
								/>
							</FormField>
						)}
						<FormField
							id="expense-first-purchase"
							label={t.plan.firstPurchase}
							required
							error={errors.firstPurchasedAt?.message}
						>
							<Input
								id="expense-first-purchase"
								type="date"
								max={today}
								aria-required="true"
								aria-invalid={!!errors.firstPurchasedAt}
								aria-describedby={describedBy(
									"expense-first-purchase",
									!!errors.firstPurchasedAt
								)}
								className={
									errors.firstPurchasedAt
										? "border-danger focus-within:border-danger"
										: undefined
								}
								{...register("firstPurchasedAt")}
							/>
						</FormField>
						{summary && (
							<p
								data-testid="plan-summary"
								className="rounded-xl bg-muted px-3 py-2.5 text-foreground text-sm"
							>
								{summary}
							</p>
						)}
					</>
				) : (
					<>
						<div className="grid grid-cols-2 gap-3">
							{!isRecurring && (
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
							)}
							<FormField id="expense-due" label={t.fields.due}>
								<Input id="expense-due" type="date" {...register("dueAt")} />
							</FormField>
							{isRecurring && (
								<FormField id="expense-paid" label={t.fields.paid}>
									<Input
										id="expense-paid"
										type="date"
										{...register("paidAt")}
									/>
								</FormField>
							)}
						</div>
						{!isRecurring && (
							<FormField id="expense-paid" label={t.fields.paid}>
								<Input id="expense-paid" type="date" {...register("paidAt")} />
							</FormField>
						)}
					</>
				)}
				{isRecurring && (
					<p
						data-testid="recurring-note"
						className="text-muted-foreground text-sm"
					>
						{t.recurring.note}
					</p>
				)}
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
