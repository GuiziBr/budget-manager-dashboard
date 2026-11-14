"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { AddFabMenu } from "@/components/month/AddMenu"
import { EnvelopeDetailsPanel } from "@/components/month/EnvelopeDetailsPanel"
import { EnvelopesCard } from "@/components/month/EnvelopesCard"
import { ExpenseDetailsPanel } from "@/components/month/ExpenseDetailsPanel"
import { ExpenseFormPanel } from "@/components/month/ExpenseFormPanel"
import { IncomePanel } from "@/components/month/IncomePanel"
import { MonthError } from "@/components/month/MonthError"
import { MonthHeader } from "@/components/month/MonthHeader"
import { MonthNotOpened } from "@/components/month/MonthNotOpened"
import { MonthNotTracked } from "@/components/month/MonthNotTracked"
import { MonthSkeleton } from "@/components/month/MonthSkeleton"
import { MonthTable } from "@/components/month/MonthTable"
import { SummaryCards } from "@/components/month/SummaryCards"
import { translations } from "@/constants/translations"
import { envelopeQueryKey } from "@/hooks/use-budget-envelopes"
import { expenseQueryKey, useUpdateExpense } from "@/hooks/use-expenses"
import { useLinkedSelection } from "@/hooks/use-linked-selection"
import { useLinkedSelectionSync } from "@/hooks/use-linked-selection-sync"
import { PHONE_QUERY, useMediaQuery } from "@/hooks/use-media-query"
import { useMonthAccess } from "@/hooks/use-month-access"
import { useMonthPage } from "@/hooks/use-month-page"
import { todayIso } from "@/lib/format-date"
import { monthLabel } from "@/lib/month"
import { isUnpaid } from "@/lib/month-rows"
import type { BudgetEnvelope, Expense } from "@/types"

// A fixed id keeps repeated failures from stacking toasts
const PAID_TOAST_ID = "paid-update-failed"

export function MonthScreen() {
	const { month, period, state, canEdit, canEditEnvelopes, error, refetch } =
		useMonthAccess()
	const label = monthLabel(month)
	const isPhone = useMediaQuery(PHONE_QUERY)
	const [incomeFor, setIncomeFor] = useState<string | null>(null)
	const [formOpen, setFormOpen] = useState(false)
	// The expense being edited; without one the form adds an expense
	const [editing, setEditing] = useState<Expense | null>(null)
	const queryClient = useQueryClient()
	// What the details panel shows (one expense or one envelope) lives in the address, so it can be shared
	const link = useLinkedSelection()
	const { selection } = link
	useLinkedSelectionSync({ ...link, month })
	// Changing month clears the income panel, so coming back to a month doesn't reopen it
	const monthKey = `${month.year}-${month.month}`
	const [panelMonth, setPanelMonth] = useState(monthKey)
	if (panelMonth !== monthKey) {
		setPanelMonth(monthKey)
		setIncomeFor(null)
		setFormOpen(false)
		setEditing(null)
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
		// Clear in place: going back would land on the entry the details were opened from,
		// which can be another page than the one the details had stepped to
		if (selection) link.clear()
		setFabMenuOpen(false)
		setEditing(expense ?? null)
		setFormOpen(true)
	}
	const openEdit = (expense: Expense) => openForm(undefined, expense)
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
			<MonthHeader onAddExpense={isPhone ? undefined : openForm} />
			{state === "loading" && <MonthSkeleton />}
			{state === "error" && (
				<MonthError error={error} onRetry={() => refetch()} />
			)}
			{state === "not-opened" && <MonthNotOpened label={label} />}
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
						returnFocusRef={detailsOpener}
					/>
					<EnvelopeDetailsPanel
						onClose={link.close}
						onNavigate={showEnvelope}
						periodId={period.id}
						month={month}
						envelopeId={selection?.kind === "envelope" ? selection.id : null}
						canEdit={canEditEnvelopes}
						returnFocusRef={detailsOpener}
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
					{isPhone && canEdit && (
						<AddFabMenu
							open={fabMenuOpen}
							onOpenChange={setFabMenuOpen}
							onAddExpense={openForm}
						/>
					)}
				</>
			)}
		</main>
	)
}
