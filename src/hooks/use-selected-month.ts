"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useBudgetPeriods } from "@/hooks/use-budget-periods"
import {
	compareMonth,
	findPeriod,
	type Month,
	nextMonth,
	prevMonth,
	resolveMonth
} from "@/lib/month"
import { monthHref } from "@/lib/navigation"

export function useSelectedMonth() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const periodsQuery = useBudgetPeriods()

	const month = resolveMonth(searchParams.get("period"))
	const periods = periodsQuery.data ?? []

	// push (not replace) so the back button returns to the previous month
	const select = (target: Month) => router.push(monthHref(target))

	return {
		month,
		period: findPeriod(periods, month),
		periods,
		comparison: compareMonth(month),
		prev: prevMonth(month),
		next: nextMonth(month),
		select,
		isLoading: periodsQuery.isLoading,
		error: periodsQuery.error,
		refetch: periodsQuery.refetch
	}
}
