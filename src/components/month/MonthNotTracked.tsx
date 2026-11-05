import { translations } from "@/constants/translations"

export function MonthNotTracked({ label }: { label: string }) {
	return (
		<div className="rounded-xl border border-dashed border-border bg-card px-4 py-12 text-center text-muted-foreground">
			<p className="font-medium text-foreground">
				{translations.month.states.notTracked.replace("{month}", label)}
			</p>
		</div>
	)
}
