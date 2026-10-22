"use client"

import type { LucideIcon } from "lucide-react"
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight
} from "lucide-react"
import { translations } from "@/constants/translations"

interface PaginationProps {
	currentPage: number
	setCurrentPage: (page: number) => void
	pages: number[]
}

function PageButton({
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
			className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent lg:size-8 lg:border-transparent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
		>
			<Icon className="size-4" aria-hidden="true" />
		</button>
	)
}

export function Pagination({
	currentPage,
	setCurrentPage,
	pages
}: PaginationProps) {
	const totalPages = pages.length

	if (totalPages <= 1) return null

	const isFirst = currentPage <= 1
	const isLast = currentPage >= totalPages
	const { common } = translations

	return (
		<>
			{/* Keeps the last rows clear of the fixed bar on desktop */}
			<div aria-hidden="true" className="hidden h-14 lg:block" />
			{/* On desktop the bar is pinned to the bottom of the viewport, left-aligned with the page content beside the sidebar (248px) */}
			<nav
				aria-label={common.pagination}
				className="flex w-full lg:pointer-events-none lg:fixed lg:right-0 lg:bottom-4 lg:left-[248px] lg:z-30 lg:w-auto"
			>
				<div className="mx-auto flex w-full max-w-[1120px] justify-start lg:px-5">
					{/* Mobile: full-width row with the page label as a pill between the arrows. Desktop: compact card with the label first. */}
					<div className="flex w-full items-center gap-2 lg:pointer-events-auto lg:w-auto lg:gap-0 lg:rounded-xl lg:border lg:border-border lg:bg-card lg:px-3 lg:py-1 lg:shadow-md">
						<PageButton
							icon={ChevronsLeft}
							label={common.firstPage}
							disabled={isFirst}
							onClick={() => setCurrentPage(1)}
						/>
						<PageButton
							icon={ChevronLeft}
							label={common.previousPage}
							disabled={isFirst}
							onClick={() => setCurrentPage(currentPage - 1)}
						/>
						<p
							className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-lg bg-accent px-1 text-sm text-muted-foreground lg:order-first lg:h-auto lg:flex-none lg:justify-start lg:bg-transparent"
							aria-live="polite"
						>
							{common.page}&nbsp;
							<span className="font-semibold text-foreground">
								{currentPage}
							</span>
							&nbsp;{common.of}&nbsp;
							<span className="font-semibold text-foreground">
								{totalPages}
							</span>
						</p>
						<PageButton
							icon={ChevronRight}
							label={common.nextPage}
							disabled={isLast}
							onClick={() => setCurrentPage(currentPage + 1)}
						/>
						<PageButton
							icon={ChevronsRight}
							label={common.lastPage}
							disabled={isLast}
							onClick={() => setCurrentPage(totalPages)}
						/>
					</div>
				</div>
			</nav>
		</>
	)
}
