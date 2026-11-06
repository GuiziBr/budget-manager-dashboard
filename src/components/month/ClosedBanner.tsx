import { Lock } from "lucide-react"
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from "@/components/ui/popover"
import { translations } from "@/constants/translations"

export function ClosedBanner({ label }: { label: string }) {
	return (
		<div
			role="status"
			className="flex min-h-9 min-w-0 items-center gap-2 rounded-[10px] border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground"
		>
			<Lock className="size-4 shrink-0" aria-hidden="true" />
			<span className="min-w-0">
				{translations.month.states.closedBanner.replace("{month}", label)}
			</span>
		</div>
	)
}

/** Phone version: a small "Closed" pill beside the month name that opens the full message. */
export function ClosedPill({ label }: { label: string }) {
	const t = translations.month.states

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="order-1 mr-auto flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground lg:hidden"
				>
					<Lock className="size-3" aria-hidden="true" />
					{t.closedBadge}
				</button>
			</PopoverTrigger>
			<PopoverContent role="status">
				{t.closedBanner.replace("{month}", label)}
			</PopoverContent>
		</Popover>
	)
}
