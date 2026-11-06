"use client"

import { ClosedBanner } from "@/components/month/ClosedBanner"
import { MonthError } from "@/components/month/MonthError"
import { MonthHeader } from "@/components/month/MonthHeader"
import { MonthNotOpened } from "@/components/month/MonthNotOpened"
import { MonthNotTracked } from "@/components/month/MonthNotTracked"
import { MonthSkeleton } from "@/components/month/MonthSkeleton"
import { translations } from "@/constants/translations"
import { useMonthAccess } from "@/hooks/use-month-access"
import { monthLabel } from "@/lib/month"

export function MonthScreen() {
	const { month, state, error, refetch } = useMonthAccess()
	const label = monthLabel(month)

	return (
		<main className="mx-auto flex max-w-[1120px] flex-col gap-4 px-4 pt-4 lg:px-5 lg:pt-6 lg:h-full">
			<h1 className="sr-only">{translations.navigation.items.month}</h1>
			<MonthHeader />
			{state === "loading" && <MonthSkeleton />}
			{state === "error" && (
				<MonthError error={error} onRetry={() => refetch()} />
			)}
			{state === "not-opened" && <MonthNotOpened label={label} />}
			{state === "not-tracked" && <MonthNotTracked label={label} />}
			{state === "closed" && <ClosedBanner label={label} />}
			{/* Summary cards, envelopes and the table arrive with T-18 onwards */}
		</main>
	)
}
