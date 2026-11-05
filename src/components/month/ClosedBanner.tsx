import { Lock } from "lucide-react"
import { translations } from "@/constants/translations"

export function ClosedBanner({ label }: { label: string }) {
	return (
		<div
			role="status"
			className="flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
		>
			<Lock className="size-4 shrink-0" aria-hidden="true" />
			{translations.month.states.closedBanner.replace("{month}", label)}
		</div>
	)
}
