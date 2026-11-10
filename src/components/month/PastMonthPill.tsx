import { History } from "lucide-react"
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from "@/components/ui/popover"
import { translations } from "@/constants/translations"
import { cn } from "@/lib/utils"

/** A small "Past month" pill beside the month name. Past months are edited like the current one; the pill explains the one exception. */
export function PastMonthPill({ className }: { className?: string }) {
	const t = translations.month.states

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						"flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground",
						className
					)}
				>
					<History className="size-3" aria-hidden="true" />
					{t.pastBadge}
				</button>
			</PopoverTrigger>
			<PopoverContent role="status">{t.pastNote}</PopoverContent>
		</Popover>
	)
}
