"use client"

import type { LucideIcon } from "lucide-react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { translations } from "@/constants/translations"
import { pageWindow } from "@/lib/pagination"
import { cn } from "@/lib/utils"

interface PaginationProps {
	currentPage: number
	setCurrentPage: (page: number) => void
	pages: number[]
	/** The count shown at the left from `lg`, such as "Showing 1–10 of 45 expenses". */
	summary?: string
}

const barClass =
	"shrink-0 border-t border-border px-3.5 py-2.5 lg:flex lg:h-[52px] lg:items-center lg:justify-between lg:px-4 lg:py-0"

function StepButton({
	icon: Icon,
	label,
	disabled,
	onClick
}: {
	icon: LucideIcon
	label: string
	disabled: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={label}
			className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-border text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 lg:size-8 lg:rounded-lg lg:border-transparent lg:text-muted-foreground lg:hover:text-foreground"
		>
			<Icon className="size-[18px] lg:size-4" aria-hidden="true" />
		</button>
	)
}

/**
 * The footer of a paged list, drawn at the bottom of its card. From `lg` it shows
 * the count and numbered pages; below `lg` just previous, "Page x of y" and next.
 * With one page only the count remains, and only from `lg`.
 */
export function Pagination({
	currentPage,
	setCurrentPage,
	pages,
	summary
}: PaginationProps) {
	const totalPages = pages.length
	const { common } = translations

	if (totalPages <= 1) {
		return summary ? (
			<div className={cn(barClass, "hidden")}>
				<p className="text-[13px] text-muted-foreground">{summary}</p>
			</div>
		) : null
	}

	return (
		<nav aria-label={common.pagination} className={barClass}>
			{summary && (
				<p className="hidden text-[13px] text-muted-foreground lg:block">
					{summary}
				</p>
			)}
			<div className="flex items-center gap-2 lg:gap-1">
				<StepButton
					icon={ChevronLeft}
					label={common.previousPage}
					disabled={currentPage <= 1}
					onClick={() => setCurrentPage(currentPage - 1)}
				/>
				<p
					className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-[10px] bg-background text-[13px] font-medium text-muted-foreground lg:hidden"
					aria-live="polite"
				>
					{common.page}&nbsp;{currentPage}&nbsp;{common.of}&nbsp;{totalPages}
				</p>
				<ol className="hidden items-center gap-1 lg:flex">
					{pageWindow(currentPage, totalPages).map((item, index) =>
						item === "ellipsis" ? (
							<li
								// biome-ignore lint/suspicious/noArrayIndexKey: at most two ellipses, always in the same slots
								key={`gap-${index}`}
								aria-hidden="true"
								className="flex size-8 items-center justify-center text-[13px] text-muted-foreground"
							>
								…
							</li>
						) : (
							<li key={item}>
								<button
									type="button"
									onClick={() => setCurrentPage(item)}
									aria-label={common.pageNumber.replace("{n}", String(item))}
									aria-current={item === currentPage ? "page" : undefined}
									className={cn(
										"flex size-8 cursor-pointer items-center justify-center rounded-lg text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
										item === currentPage
											? "bg-primary font-semibold text-primary-foreground"
											: "font-medium text-foreground hover:bg-accent"
									)}
								>
									{item}
								</button>
							</li>
						)
					)}
				</ol>
				<StepButton
					icon={ChevronRight}
					label={common.nextPage}
					disabled={currentPage >= totalPages}
					onClick={() => setCurrentPage(currentPage + 1)}
				/>
			</div>
		</nav>
	)
}
