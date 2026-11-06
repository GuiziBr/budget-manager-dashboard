"use client"

import { ChevronDown, ChevronLeft, ChevronRight, Ellipsis } from "lucide-react"
import { ClosedBanner, ClosedPill } from "@/components/month/ClosedBanner"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { translations } from "@/constants/translations"
import { useMonthAccess } from "@/hooks/use-month-access"
import { groupPeriodsByYear, monthLabel } from "@/lib/month"

export function MonthHeader() {
	const { month, periods, prev, next, select, state } = useMonthAccess()
	const groups = groupPeriodsByYear(periods)
	const t = translations.month

	return (
		<header className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3 lg:pb-2">
			<div className="flex w-full min-w-0 items-center gap-2 lg:w-76 lg:shrink lg:gap-1">
				<Button
					variant="outline"
					size="icon"
					className="size-10 shrink-0 rounded-[10px] shadow-none lg:size-9 order-2 lg:order-1"
					aria-label={t.previous.replace("{month}", monthLabel(prev))}
					onClick={() => select(prev)}
				>
					<ChevronLeft className="size-[18px] lg:size-4" />
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className={`order-1 min-w-0 gap-1 px-0 lg:order-2 lg:mr-0 lg:flex-1 lg:gap-1.5 lg:px-1.5 ${state === "closed" ? "" : "mr-auto"}`}
							aria-label={t.switcherLabel.replace("{month}", monthLabel(month))}
						>
							<span className="font-serif text-[22px] font-bold tracking-[-0.4px] lg:text-2xl">
								{monthLabel(month)}
							</span>
							<ChevronDown className="size-[18px] text-muted-foreground" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="max-h-80">
						{groups.length === 0 ? (
							<DropdownMenuLabel className="font-normal text-muted-foreground">
								{t.noOpenedMonths}
							</DropdownMenuLabel>
						) : (
							groups.map((group) => (
								<div key={group.year}>
									<DropdownMenuLabel>{group.year}</DropdownMenuLabel>
									{group.periods.map((period) => {
										const selected =
											period.year === month.year && period.month === month.month
										return (
											<DropdownMenuItem
												key={period.id}
												aria-current={selected ? "true" : undefined}
												className={selected ? "font-semibold" : undefined}
												onSelect={() =>
													select({ year: period.year, month: period.month })
												}
											>
												{monthLabel(period)}
											</DropdownMenuItem>
										)
									})}
								</div>
							))
						)}
					</DropdownMenuContent>
				</DropdownMenu>
				{state === "closed" && <ClosedPill label={monthLabel(month)} />}
				<Button
					variant="outline"
					size="icon"
					className="size-10 shrink-0 rounded-[10px] shadow-none lg:size-9 order-3"
					disabled={!next}
					aria-label={
						next
							? t.next.replace("{month}", monthLabel(next))
							: t.next.replace(" {month}", "")
					}
					onClick={() => next && select(next)}
				>
					<ChevronRight className="size-[18px] lg:size-4" />
				</Button>
			</div>
			{state === "closed" && (
				<div className="hidden min-w-0 lg:block lg:flex-1">
					<ClosedBanner label={monthLabel(month)} />
				</div>
			)}
			{/* Placeholder: Delete month arrives with T-38 */}
			<Button
				variant="outline"
				size="icon"
				disabled
				className="ml-auto hidden rounded-[10px] shadow-none lg:inline-flex"
				aria-label={t.moreActions}
			>
				<Ellipsis className="size-4" />
			</Button>
		</header>
	)
}
