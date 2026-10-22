import { translations } from "@/constants/translations"

export default function DashboardPage() {
	return (
		<main className="mx-auto flex max-w-[1120px] flex-col gap-3 px-5 lg:h-full">
			<div className="rounded-xl border border-dashed border-border bg-card px-4 py-12 text-center text-muted-foreground">
				<p className="font-medium text-foreground">
					{translations.dashboard.emptyTitle}
				</p>
				<p className="text-sm">{translations.dashboard.emptyDescription}</p>
			</div>
		</main>
	)
}
