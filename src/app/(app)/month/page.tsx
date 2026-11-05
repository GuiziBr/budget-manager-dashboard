import { Suspense } from "react"
import { MonthScreen } from "@/components/month/MonthScreen"

export default function MonthPage() {
	return (
		<Suspense>
			<MonthScreen />
		</Suspense>
	)
}
