"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { translations } from "@/constants/translations"
import { useBudgetEnvelope } from "@/hooks/use-budget-envelopes"
import { useBudgetPeriods } from "@/hooks/use-budget-periods"
import { useExpense } from "@/hooks/use-expenses"
import { ApiError } from "@/lib/api"
import type { Month } from "@/lib/month"
import type { Selection } from "@/lib/selection-link"

interface LinkedSelectionSyncOptions {
	selection: Selection | null
	/** The month the screen is showing. */
	month: Month
	moveToMonth: (month: Month) => void
	/** Removes a link that points at nothing. */
	clear: () => void
}

const t = translations.month.details

const LINK_TOAST_ID = "linked-selection"

// 404: it is gone. 400: the id isn't even a UUID
const isMissing = (error: unknown) =>
	error instanceof ApiError && (error.status === 404 || error.status === 400)

/**
 * Makes a link to an expense or envelope land on it: the screen switches to the
 * month it belongs to, and a link to something that doesn't exist (or whose
 * month isn't opened) says so and drops the param. For a row opened on this
 * screen the details are already cached, so nothing is requested.
 */
export function useLinkedSelectionSync({
	selection,
	month,
	moveToMonth,
	clear
}: LinkedSelectionSyncOptions) {
	const expense = useExpense(
		selection?.kind === "expense" ? selection.id : undefined
	)
	const envelope = useBudgetEnvelope(
		selection?.kind === "envelope" ? selection.id : undefined
	)
	const periods = useBudgetPeriods()

	const query = selection?.kind === "expense" ? expense : envelope
	const periodId = query.data?.budgetPeriodId
	const target = periodId
		? periods.data?.find((p) => p.id === periodId)
		: undefined

	const missing = selection
		? (query.isError && isMissing(query.error)) ||
			(!!periodId && !!periods.data && !target)
		: false
	const failed = !!selection && query.isError && !isMissing(query.error)

	useEffect(() => {
		if (!target) return
		if (target.year !== month.year || target.month !== month.month) {
			moveToMonth({ year: target.year, month: target.month })
		}
	}, [target, month.year, month.month, moveToMonth])

	useEffect(() => {
		if (!selection || !(missing || failed)) return
		// A fixed id keeps a repeated run of this effect (dev double render) from stacking toasts
		toast.error(
			failed
				? translations.errors.generic
				: selection.kind === "expense"
					? t.expenseNotFound
					: t.envelopeNotFound,
			{ id: LINK_TOAST_ID }
		)
		clear()
	}, [selection, missing, failed, clear])
}
