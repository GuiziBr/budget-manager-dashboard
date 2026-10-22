import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

export type SortIndicator = "↑" | "↓" | ""

const SORT_ICON = {
	"↑": ChevronUp,
	"↓": ChevronDown,
	"": ChevronsUpDown
} as const

const ARIA_SORT = {
	"↑": "ascending",
	"↓": "descending",
	"": "none"
} as const

interface SortableHeaderProps {
	column: string
	label: string
	indicator: SortIndicator
	onSort: (column: string) => void
	className?: string
}

export function SortableHeader({
	column,
	label,
	indicator,
	onSort,
	className
}: SortableHeaderProps) {
	const SortIcon = SORT_ICON[indicator]

	return (
		<th
			scope="col"
			aria-sort={ARIA_SORT[indicator]}
			className={cn("bg-background/60 px-3 py-3 text-left md:px-4", className)}
		>
			<button
				type="button"
				onClick={() => onSort(column)}
				className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{label}
				<SortIcon
					aria-hidden="true"
					className={cn(
						"size-3.5 shrink-0",
						indicator ? "text-foreground" : "opacity-50"
					)}
				/>
			</button>
		</th>
	)
}
