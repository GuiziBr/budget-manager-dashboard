"use client"

import { useSelectedMonth } from "@/hooks/use-selected-month"
import { canEditMonth, getMonthState } from "@/lib/month-state"

/** What the selected month allows. Components read `canEdit` to hide actions in closed months. */
export function useMonthAccess() {
	const selected = useSelectedMonth()
	const state = getMonthState(selected)

	return {
		...selected,
		state,
		canEdit: canEditMonth(state)
	}
}
