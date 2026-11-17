"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal"
import { AddFabMenu } from "@/components/month/AddMenu"
import { EnvelopeDetailsPanel } from "@/components/month/EnvelopeDetailsPanel"
import { EnvelopeFormPanel } from "@/components/month/EnvelopeFormPanel"
import { EnvelopesCard } from "@/components/month/EnvelopesCard"
import { ExpenseDetailsPanel } from "@/components/month/ExpenseDetailsPanel"
import { ExpenseFormPanel } from "@/components/month/ExpenseFormPanel"
import { IncomeFormPanel } from "@/components/month/IncomeFormPanel"
import { IncomePanel } from "@/components/month/IncomePanel"
import { InstallmentPlanDialog } from "@/components/month/InstallmentPlanDialog"
import { MonthError } from "@/components/month/MonthError"
import { MonthHeader } from "@/components/month/MonthHeader"
import { MonthNotOpened } from "@/components/month/MonthNotOpened"
import { MonthNotTracked } from "@/components/month/MonthNotTracked"
import { MonthSkeleton } from "@/components/month/MonthSkeleton"
import { MonthTable } from "@/components/month/MonthTable"
import { OpenMonthReview } from "@/components/month/OpenMonthReview"
import { SummaryCards } from "@/components/month/SummaryCards"
import { translations } from "@/constants/translations"
import {
	BUDGET_ENVELOPES_QUERY_KEY,
	envelopeQueryKey,
	useDeleteEnvelope,
	useMonthEnvelopes
} from "@/hooks/use-budget-envelopes"
import { useCreateBudgetPeriod } from "@/hooks/use-budget-periods"
import { useCategories } from "@/hooks/use-categories"
import {
	EXPENSES_QUERY_KEY,
	expenseQueryKey,
	useDeleteExpense,
	useUpdateExpense
} from "@/hooks/use-expenses"
import { INCOMES_QUERY_KEY, useDeleteIncome } from "@/hooks/use-incomes"
import { useLinkedPlan } from "@/hooks/use-linked-plan"
import { useLinkedSelection } from "@/hooks/use-linked-selection"
import { useLinkedSelectionSync } from "@/hooks/use-linked-selection-sync"
import { PHONE_QUERY, useMediaQuery } from "@/hooks/use-media-query"
import { useMonthAccess } from "@/hooks/use-month-access"
import { useMonthPage } from "@/hooks/use-month-page"
import { ApiError } from "@/lib/api"
import {
	describeApiError,
	getApiErrorMessage,
	isMonthClosedError
} from "@/lib/api-error-message"
import {
	availableEnvelopeCategories,
	envelopeDeleteMessage
} from "@/lib/envelope-form"
import { deleteMessage } from "@/lib/expense-delete"
import { todayIso } from "@/lib/format-date"
import { incomeDeleteMessage } from "@/lib/income-form"
import { monthLabel } from "@/lib/month"
import { isUnpaid } from "@/lib/month-rows"
import type { BudgetEnvelope, Expense, Income } from "@/types"

// A fixed id keeps repeated failures from stacking toasts
const PAID_TOAST_ID = "paid-update-failed"
const DELETE_TOAST_ID = "expense-delete-failed"
const INCOME_DELETE_TOAST_ID = "income-delete-failed"
const ENVELOPE_DELETE_TOAST_ID = "envelope-delete-failed"
const OPEN_MONTH_TOAST_ID = "month-open-failed"

export function MonthScreen() {
	const { month, period, state, canEdit, canEditEnvelopes, error, refetch } =
		useMonthAccess()
	const label = monthLabel(month)
	const isPhone = useMediaQuery(PHONE_QUERY)
	const [incomeFor, setIncomeFor] = useState<string | null>(null)
	const [formOpen, setFormOpen] = useState(false)
	// The expense being edited; without one the form adds an expense
	const [editing, setEditing] = useState<Expense | null>(null)
	// The expense waiting for the delete confirmation
	const [deleting, setDeleting] = useState<Expense | null>(null)
	const [incomeFormOpen, setIncomeFormOpen] = useState(false)
	// The income being edited; without one the form adds an income
	const [editingIncome, setEditingIncome] = useState<Income | null>(null)
	// The income waiting for the delete confirmation
	const [deletingIncome, setDeletingIncome] = useState<Income | null>(null)
	// The income form opened from the income panel gives the panel back when it closes
	const [returnToIncomes, setReturnToIncomes] = useState(false)
	const [envelopeFormOpen, setEnvelopeFormOpen] = useState(false)
	// The envelope whose budget is being edited; without one the form adds an envelope
	const [editingEnvelope, setEditingEnvelope] = useState<BudgetEnvelope | null>(
		null
	)
	// The envelope waiting for the delete confirmation
	const [deletingEnvelope, setDeletingEnvelope] =
		useState<BudgetEnvelope | null>(null)
	const queryClient = useQueryClient()
	const categories = useCategories()
	const monthEnvelopes = useMonthEnvelopes(period?.id)
	const categoryNameOf = (id: string) =>
		categories.data?.find((category) => category.id === id)?.name ?? null
	// Known only once both lists loaded; until then the entry stays usable (the form shows its own loading)
	const noEnvelopeLeft =
		!!categories.data &&
		!!monthEnvelopes.data &&
		availableEnvelopeCategories(categories.data, monthEnvelopes.data).length ===
			0
	// What the details panel shows (one expense or one envelope) lives in the address, so it can be shared
	const link = useLinkedSelection()
	// The installment plan dialog is in the address too (`?plan=`), over the row's details
	const plan = useLinkedPlan()
	// An expense being deleted is hidden at once: the address updates a moment later,
	// and until then the panel would read the gone row by id and report a 404
	const [removingId, setRemovingId] = useState<string | null>(null)
	const selection =
		link.selection && link.selection.id === removingId ? null : link.selection
	useLinkedSelectionSync({ ...link, selection, month })
	// Changing month clears the income panel, so coming back to a month doesn't reopen it
	const monthKey = `${month.year}-${month.month}`
	// Read by callbacks that outlive a render, such as a delete that fails after the month changed
	const monthKeyRef = useRef(monthKey)
	monthKeyRef.current = monthKey
	const [panelMonth, setPanelMonth] = useState(monthKey)
	// The month just opened, while its review (M-02) is on screen
	const [reviewPeriodId, setReviewPeriodId] = useState<string | null>(null)
	if (panelMonth !== monthKey) {
		setPanelMonth(monthKey)
		setIncomeFor(null)
		setFormOpen(false)
		setEditing(null)
		setDeleting(null)
		setIncomeFormOpen(false)
		setEditingIncome(null)
		setDeletingIncome(null)
		setReturnToIncomes(false)
		setEnvelopeFormOpen(false)
		setEditingEnvelope(null)
		setDeletingEnvelope(null)
		setReviewPeriodId(null)
	}
	const createPeriod = useCreateBudgetPeriod()
	const openMonth = () => {
		const requestedKey = monthKey
		createPeriod.mutate(
			{ year: month.year, month: month.month },
			{
				// A new month opens its review; a 409 (already open) doesn't. If the user moved
				// to another month while the request ran, the review would carry the wrong name
				onSuccess: (created) => {
					if (monthKeyRef.current === requestedKey) {
						setReviewPeriodId(created.id)
					}
				},
				onError: (error) => {
					const described = describeApiError(error, {
						action: "openMonth",
						month: label
					})
					if (described.kind === "monthExists") {
						// Opened elsewhere: load the existing month
						toast.info(described.message, { id: OPEN_MONTH_TOAST_ID })
						refetch()
						return
					}
					// Anything else is generic: a 422 here would read as the envelope message
					toast.error(translations.errors.generic, { id: OPEN_MONTH_TOAST_ID })
				}
			}
		)
	}
	const updateExpense = useUpdateExpense({ optimistic: true })
	// Ticking records today; unticking clears the date. The change shows at once and rolls back on failure
	const togglePaid = (expense: Expense) => {
		updateExpense.mutate(
			{
				id: expense.id,
				input: { paidAt: isUnpaid(expense) ? todayIso() : null }
			},
			{
				// Expenses can be changed in any opened month, so every failure is the generic one
				onError: () =>
					toast.error(translations.month.table.paidFailed, {
						id: PAID_TOAST_ID
					})
			}
		)
	}
	const deleteExpense = useDeleteExpense()
	const confirmDelete = () => {
		if (!deleting) return
		const expense = deleting
		const confirmedMonth = monthKey
		// Close the open details first: once the row is gone the panel would read it by id and hit a 404
		const wasOpen =
			link.selection?.kind === "expense" && link.selection.id === expense.id
		if (wasOpen) {
			setRemovingId(expense.id)
			link.clear()
		}
		deleteExpense.mutate(expense.id, {
			onSuccess: () => {
				setDeleting(null)
				toast.success(
					translations.month.delete.deleted.replace(
						"{item}",
						expense.description
					)
				)
			},
			onError: (error) => {
				setDeleting(null)
				// Already gone (deleted elsewhere): a failed request doesn't refresh the list
				// on its own, so do it here to drop the row and update the totals
				if (error instanceof ApiError && error.status === 404) {
					queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY })
					return
				}
				// Still there: bring the details back, unless the month changed meanwhile:
				// the address captured here would send the screen back to the old month
				setRemovingId(null)
				if (wasOpen && monthKeyRef.current === confirmedMonth) {
					link.show({ kind: "expense", id: expense.id })
				}
				toast.error(translations.month.delete.failed, { id: DELETE_TOAST_ID })
			}
		})
	}
	const deleteIncome = useDeleteIncome()
	const confirmDeleteIncome = () => {
		if (!deletingIncome) return
		const income = deletingIncome
		deleteIncome.mutate(income.id, {
			onSuccess: () => {
				setDeletingIncome(null)
				toast.success(
					translations.month.income.deleted.replace(
						"{item}",
						income.description
					)
				)
			},
			onError: (error) => {
				setDeletingIncome(null)
				// Already gone (deleted elsewhere): refresh to drop it and update the totals
				if (error instanceof ApiError && error.status === 404) {
					queryClient.invalidateQueries({ queryKey: INCOMES_QUERY_KEY })
					return
				}
				toast.error(translations.month.income.deleteFailed, {
					id: INCOME_DELETE_TOAST_ID
				})
			}
		})
	}
	const deleteEnvelope = useDeleteEnvelope()
	const confirmDeleteEnvelope = () => {
		if (!deletingEnvelope) return
		const envelope = deletingEnvelope
		const name = categoryNameOf(envelope.categoryId)
		const confirmedMonth = monthKey
		// Close the open details first: once the envelope is gone the panel would read it by id and hit a 404
		const wasOpen =
			link.selection?.kind === "envelope" && link.selection.id === envelope.id
		if (wasOpen) {
			setRemovingId(envelope.id)
			link.clear()
		}
		deleteEnvelope.mutate(envelope.id, {
			onSuccess: () => {
				setDeletingEnvelope(null)
				toast.success(
					translations.month.envelopes.deleted.replace(
						"{category}",
						name ?? translations.month.details.deleted
					)
				)
			},
			onError: (error) => {
				setDeletingEnvelope(null)
				// Already gone (deleted elsewhere): refresh to drop the tile and update the totals
				if (error instanceof ApiError && error.status === 404) {
					queryClient.invalidateQueries({
						queryKey: BUDGET_ENVELOPES_QUERY_KEY
					})
					return
				}
				// Still there: bring the details back, unless the month changed meanwhile
				setRemovingId(null)
				if (wasOpen && monthKeyRef.current === confirmedMonth) {
					link.show({ kind: "envelope", id: envelope.id })
				}
				// The month ended while the screen was open: retrying can't work, so say why
				// and refresh, which is the only way the screen learns the envelopes are locked
				const closed = isMonthClosedError(error)
				if (closed) {
					queryClient.invalidateQueries({
						queryKey: BUDGET_ENVELOPES_QUERY_KEY
					})
				}
				toast.error(
					closed
						? getApiErrorMessage(error, { action: "deleteEnvelope" })
						: translations.month.envelopes.deleteFailed,
					{ id: ENVELOPE_DELETE_TOAST_ID }
				)
			}
		})
	}
	const incomeOpener = useRef<HTMLElement | null>(null)
	const detailsOpener = useRef<HTMLElement | null>(null)
	const formOpener = useRef<HTMLElement | null>(null)
	const [fabMenuOpen, setFabMenuOpen] = useState(false)
	const { page, setPage } = useMonthPage()
	// One panel at a time: the form replaces whatever else is open
	const openForm = (opener?: HTMLElement | null, expense?: Expense) => {
		formOpener.current =
			opener ?? (document.activeElement as HTMLElement | null)
		setIncomeFor(null)
		setIncomeFormOpen(false)
		setEnvelopeFormOpen(false)
		setReturnToIncomes(false)
		// Clear in place: going back would land on the entry the details were opened from,
		// which can be another page than the one the details had stepped to
		if (selection) link.clear()
		setFabMenuOpen(false)
		setEditing(expense ?? null)
		setFormOpen(true)
	}
	const openEdit = (expense: Expense) => openForm(undefined, expense)
	// One panel at a time: the income form replaces whatever else is open. From the income
	// panel, the panel comes back once the form closes, so the change shows in the list
	const openIncomeForm = (
		opener?: HTMLElement | null,
		income?: Income,
		fromPanel = false
	) => {
		formOpener.current = fromPanel
			? incomeOpener.current
			: (opener ?? (document.activeElement as HTMLElement | null))
		setIncomeFor(null)
		setFormOpen(false)
		setEnvelopeFormOpen(false)
		if (selection) link.clear()
		setFabMenuOpen(false)
		setEditingIncome(income ?? null)
		setReturnToIncomes(fromPanel)
		setIncomeFormOpen(true)
	}
	const closeIncomeForm = () => {
		// A save can finish after the month changed; it must not close a form opened for another month
		if (monthKeyRef.current !== monthKey) return
		setIncomeFormOpen(false)
		if (returnToIncomes && period) setIncomeFor(period.id)
		setReturnToIncomes(false)
	}
	// One panel at a time: the envelope form replaces whatever else is open. Opened from the
	// envelope's details, the details come back once the budget is saved
	const openEnvelopeForm = (
		opener?: HTMLElement | null,
		envelope?: BudgetEnvelope
	) => {
		formOpener.current =
			opener ?? (document.activeElement as HTMLElement | null)
		setIncomeFor(null)
		setFormOpen(false)
		setIncomeFormOpen(false)
		setReturnToIncomes(false)
		if (selection) link.clear()
		setFabMenuOpen(false)
		setEditingEnvelope(envelope ?? null)
		setEnvelopeFormOpen(true)
	}
	const closeEnvelopeForm = () => {
		// A save can finish after the month changed; it must not close a form opened for another month
		if (monthKeyRef.current !== monthKey) return
		setEnvelopeFormOpen(false)
	}
	// The row is cached under its own id, so the panel opens without asking the API for it
	const selectExpense = (expense: Expense) => {
		detailsOpener.current = document.activeElement as HTMLElement | null
		queryClient.setQueryData(expenseQueryKey(expense.id), expense)
		link.open({ kind: "expense", id: expense.id })
	}
	// Stepping to a neighbour keeps the original opener, so closing still returns to where it started
	const showExpense = (expense: Expense, page: number) => {
		queryClient.setQueryData(expenseQueryKey(expense.id), expense)
		link.show({ kind: "expense", id: expense.id }, { page })
	}
	const selectEnvelope = (envelope: BudgetEnvelope) => {
		detailsOpener.current = document.activeElement as HTMLElement | null
		queryClient.setQueryData(envelopeQueryKey(envelope.id), envelope)
		link.open({ kind: "envelope", id: envelope.id })
	}

	const showEnvelope = (envelope: BudgetEnvelope) => {
		queryClient.setQueryData(envelopeQueryKey(envelope.id), envelope)
		link.show({ kind: "envelope", id: envelope.id })
	}

	return (
		<main className="mx-auto flex max-w-[1120px] flex-col gap-3 px-4 pt-4 lg:h-full lg:px-5 lg:pt-6">
			<h1 className="sr-only">{translations.navigation.items.month}</h1>
			{/* The phone has the floating button instead */}
			<MonthHeader
				onAddExpense={isPhone ? undefined : openForm}
				onAddIncome={isPhone ? undefined : (opener) => openIncomeForm(opener)}
				onAddEnvelope={
					isPhone || !canEditEnvelopes
						? undefined
						: (opener) => openEnvelopeForm(opener)
				}
				envelopeDisabledReason={
					noEnvelopeLeft
						? translations.month.addMenu.envelope.disabled
						: undefined
				}
			/>
			{state === "loading" && <MonthSkeleton />}
			{state === "error" && (
				<MonthError error={error} onRetry={() => refetch()} />
			)}
			{state === "not-opened" && (
				<MonthNotOpened
					label={label}
					onOpen={openMonth}
					isOpening={createPeriod.isPending}
				/>
			)}
			{state === "not-tracked" && <MonthNotTracked label={label} />}
			{(state === "open" || state === "past") && period && (
				<>
					<SummaryCards
						periodId={period.id}
						onViewIncome={() => {
							incomeOpener.current =
								document.activeElement as HTMLElement | null
							setIncomeFor(period.id)
						}}
					/>
					<IncomePanel
						open={incomeFor === period.id}
						onOpenChange={(open) => setIncomeFor(open ? period.id : null)}
						periodId={period.id}
						month={month}
						canEdit={canEdit}
						returnFocusRef={incomeOpener}
						onAdd={() => openIncomeForm(undefined, undefined, true)}
						onEdit={(income) => openIncomeForm(undefined, income, true)}
						onDelete={setDeletingIncome}
					/>
					<IncomeFormPanel
						open={incomeFormOpen && canEdit}
						onClose={closeIncomeForm}
						periodId={period.id}
						month={month}
						income={editingIncome}
						returnFocusRef={formOpener}
					/>
					<EnvelopesCard
						periodId={period.id}
						selectedEnvelopeId={
							selection?.kind === "envelope" ? selection.id : null
						}
						onSelectEnvelope={selectEnvelope}
					/>
					<MonthTable
						periodId={period.id}
						canEdit={canEdit}
						selectedId={selection?.kind === "expense" ? selection.id : null}
						onSelectRow={(row) => selectExpense(row.expense)}
						onTogglePaid={togglePaid}
						onEdit={openEdit}
						onDelete={setDeleting}
						onAddExpense={() => openForm()}
					/>
					<ExpenseDetailsPanel
						onClose={link.close}
						onNavigate={showExpense}
						periodId={period.id}
						expenseId={selection?.kind === "expense" ? selection.id : null}
						canEdit={canEdit}
						onTogglePaid={togglePaid}
						onEdit={openEdit}
						onDelete={setDeleting}
						onViewPlan={plan.open}
						returnFocusRef={detailsOpener}
					/>
					{plan.planId && (
						<InstallmentPlanDialog
							key={plan.planId}
							planId={plan.planId}
							onClose={plan.close}
							onMissing={plan.clear}
							canEdit={canEdit}
						/>
					)}
					<EnvelopeDetailsPanel
						onClose={link.close}
						onNavigate={showEnvelope}
						periodId={period.id}
						month={month}
						envelopeId={selection?.kind === "envelope" ? selection.id : null}
						canEdit={canEditEnvelopes}
						returnFocusRef={detailsOpener}
						onEdit={(envelope) => openEnvelopeForm(undefined, envelope)}
						onDelete={setDeletingEnvelope}
					/>
					<EnvelopeFormPanel
						open={envelopeFormOpen && canEditEnvelopes}
						onClose={closeEnvelopeForm}
						periodId={period.id}
						month={month}
						envelope={editingEnvelope}
						onSaved={(saved) => {
							// Back to the envelope's details, so the new budget shows at once
							if (saved && monthKeyRef.current === monthKey) {
								link.show({ kind: "envelope", id: saved.id })
							}
						}}
						returnFocusRef={formOpener}
					/>
					<ExpenseFormPanel
						open={formOpen && canEdit}
						onClose={() => setFormOpen(false)}
						periodId={period.id}
						month={month}
						expense={editing}
						onSaved={() => {
							// A new expense is on the first page; an edited row stays where it is
							if (!editing && page > 1) setPage(1)
						}}
						returnFocusRef={formOpener}
					/>
					<ConfirmDeleteModal
						isOpen={deleting !== null && canEdit}
						onClose={() => setDeleting(null)}
						onConfirm={confirmDelete}
						title={translations.month.delete.title}
						description={deleting ? deleteMessage(deleting) : ""}
						isPending={deleteExpense.isPending}
					/>
					<ConfirmDeleteModal
						isOpen={deletingIncome !== null && canEdit}
						onClose={() => setDeletingIncome(null)}
						onConfirm={confirmDeleteIncome}
						title={translations.month.income.deleteTitle}
						description={
							deletingIncome ? incomeDeleteMessage(deletingIncome) : ""
						}
						isPending={deleteIncome.isPending}
					/>
					<ConfirmDeleteModal
						isOpen={deletingEnvelope !== null && canEditEnvelopes}
						onClose={() => setDeletingEnvelope(null)}
						onConfirm={confirmDeleteEnvelope}
						title={translations.month.envelopes.deleteTitle}
						description={
							deletingEnvelope
								? envelopeDeleteMessage(
										categoryNameOf(deletingEnvelope.categoryId)
									)
								: ""
						}
						isPending={deleteEnvelope.isPending}
					/>
					{isPhone && canEdit && (
						<AddFabMenu
							open={fabMenuOpen}
							onOpenChange={setFabMenuOpen}
							onAddExpense={openForm}
							onAddIncome={(opener) => openIncomeForm(opener)}
							onAddEnvelope={
								canEditEnvelopes
									? (opener) => openEnvelopeForm(opener)
									: undefined
							}
							envelopeDisabledReason={
								noEnvelopeLeft
									? translations.month.addMenu.envelope.disabled
									: undefined
							}
						/>
					)}
				</>
			)}
			{reviewPeriodId && (
				<OpenMonthReview
					key={reviewPeriodId}
					periodId={reviewPeriodId}
					month={month}
					// A save that finishes after a month change must not close a later review
					onClose={() =>
						setReviewPeriodId((current) =>
							current === reviewPeriodId ? null : current
						)
					}
				/>
			)}
		</main>
	)
}
