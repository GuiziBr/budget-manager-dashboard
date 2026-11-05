"use client"

import { MonthHeader } from "@/components/month/MonthHeader"
import { translations } from "@/constants/translations"

export function MonthScreen() {
	return (
		<main className="mx-auto flex max-w-[1120px] flex-col gap-4 px-4 pt-4 lg:px-5 lg:pt-6 lg:h-full">
			<h1 className="sr-only">{translations.navigation.items.month}</h1>
			<MonthHeader />
			{/* Month states and content arrive with T-17 onwards */}
		</main>
	)
}
