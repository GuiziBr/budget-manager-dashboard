"use client"

import { useSelectedMonth } from "@/hooks/use-selected-month"
import {
	canEditEnvelopes,
	canEditMonth,
	getMonthState
} from "@/lib/month-state"

/** What the selected month allows. `canEdit` covers expenses and incomes; `canEditEnvelopes` is false in past months. */
export function useMonthAccess() {
	const selected = useSelectedMonth()
	const state = getMonthState(selected)

	return {
		...selected,
		state,
		canEdit: canEditMonth(state),
		canEditEnvelopes: canEditEnvelopes(state)
	}
}
