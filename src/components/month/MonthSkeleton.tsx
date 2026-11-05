import { Skeleton } from "@/components/ui/skeleton"
import { translations } from "@/constants/translations"

export function MonthSkeleton() {
	return (
		<div role="status" className="flex flex-col gap-4">
			<span className="sr-only">{translations.month.states.loading}</span>
			<div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
				<Skeleton className="h-24" />
				<Skeleton className="h-24" />
				<Skeleton className="h-24" />
			</div>
			<div className="flex flex-col gap-2">
				{["a", "b", "c", "d", "e", "f"].map((key) => (
					<Skeleton key={key} className="h-12" />
				))}
			</div>
		</div>
	)
}
