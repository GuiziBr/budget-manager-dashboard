import { ChevronDown } from "lucide-react"
import { translations } from "@/constants/translations"
import { cn } from "@/lib/utils"

// The Hide / Show button and the animated body shared by the Categories card and the review's
// sections. The labels are the envelopes card's ("Hide", "Show").

export function CollapseHeader({
	collapsed,
	controls,
	onToggle,
	className,
	as: Heading = "h2",
	children
}: {
	as?: "h2" | "h3"
	collapsed: boolean
	controls: string
	onToggle: () => void
	className?: string
	children: React.ReactNode
}) {
	const t = translations.month.envelopes
	return (
		<Heading className="m-0">
			<button
				type="button"
				aria-expanded={!collapsed}
				aria-controls={controls}
				onClick={onToggle}
				className={cn(
					"group flex w-full items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					className
				)}
			>
				<span className="flex items-center gap-2">{children}</span>
				<span className="inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-medium text-muted-foreground group-hover:bg-muted">
					<span className="grid text-right">
						<span
							aria-hidden={collapsed}
							className={cn(
								"col-start-1 row-start-1",
								collapsed && "invisible"
							)}
						>
							{t.hide}
						</span>
						<span
							aria-hidden={!collapsed}
							className={cn(
								"col-start-1 row-start-1",
								!collapsed && "invisible"
							)}
						>
							{t.show}
						</span>
					</span>
					<ChevronDown
						aria-hidden="true"
						className={cn(
							"size-4 transition-transform duration-300 ease-in-out motion-reduce:transition-none",
							!collapsed && "rotate-180"
						)}
					/>
				</span>
			</button>
		</Heading>
	)
}

/**
 * The collapsible part. It stays mounted so the height and opacity can animate
 * (0fr to 1fr rows); while collapsed it is out of the tab order and the accessibility tree.
 */
export function CollapsibleBody({
	id,
	collapsed,
	children
}: {
	id: string
	collapsed: boolean
	children: React.ReactNode
}) {
	return (
		<div
			id={id}
			aria-hidden={collapsed}
			inert={collapsed}
			className={cn(
				"grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none",
				collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
			)}
		>
			<div className="min-h-0 overflow-hidden">{children}</div>
		</div>
	)
}
