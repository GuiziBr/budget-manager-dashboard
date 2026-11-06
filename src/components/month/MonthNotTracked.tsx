import { translations } from "@/constants/translations"

export function MonthNotTracked({ label }: { label: string }) {
	return (
		<div className="flex min-h-[93px] items-center justify-center rounded-xl border border-border bg-card px-4 py-4 text-center text-muted-foreground">
			<p className="font-medium text-foreground">
				{translations.month.states.notTracked.replace("{month}", label)}
			</p>
		</div>
	)
}
