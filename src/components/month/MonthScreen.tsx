"use client"

import { useRef, useState } from "react"
import { AddFab } from "@/components/month/AddFab"
import { EnvelopesCard } from "@/components/month/EnvelopesCard"
import { IncomePanel } from "@/components/month/IncomePanel"
import { MonthError } from "@/components/month/MonthError"
import { MonthHeader } from "@/components/month/MonthHeader"
import { MonthNotOpened } from "@/components/month/MonthNotOpened"
import { MonthNotTracked } from "@/components/month/MonthNotTracked"
import { MonthSkeleton } from "@/components/month/MonthSkeleton"
import { MonthTable } from "@/components/month/MonthTable"
import { SummaryCards } from "@/components/month/SummaryCards"
import { translations } from "@/constants/translations"
import { PHONE_QUERY, useMediaQuery } from "@/hooks/use-media-query"
import { useMonthAccess } from "@/hooks/use-month-access"
import { monthLabel } from "@/lib/month"

export function MonthScreen() {
	const { month, period, state, canEdit, error, refetch } = useMonthAccess()
	const label = monthLabel(month)
	const isPhone = useMediaQuery(PHONE_QUERY)
	// Tied to a month, so changing month closes the panel
	const [incomeFor, setIncomeFor] = useState<string | null>(null)
	const incomeOpener = useRef<HTMLElement | null>(null)

	return (
		<main className="mx-auto flex max-w-[1120px] flex-col gap-3 px-4 pt-4 lg:h-full lg:px-5 lg:pt-6">
			<h1 className="sr-only">{translations.navigation.items.month}</h1>
			<MonthHeader />
			{state === "loading" && <MonthSkeleton />}
			{state === "error" && (
				<MonthError error={error} onRetry={() => refetch()} />
			)}
			{state === "not-opened" && <MonthNotOpened label={label} />}
			{state === "not-tracked" && <MonthNotTracked label={label} />}
			{(state === "open" || state === "closed") && period && (
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
					<EnvelopesCard periodId={period.id} />
					<MonthTable periodId={period.id} canEdit={canEdit} />
					{isPhone && canEdit && <AddFab />}
				</>
			)}
		</main>
	)
}
