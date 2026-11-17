import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { translations } from "@/constants/translations"
import { getApiErrorMessage } from "@/lib/api-error-message"

interface ReviewSectionProps {
	title: string
	hint?: string
	isLoading: boolean
	isError: boolean
	error?: unknown
	errorTitle: string
	onRetry: () => void
	/** Shown when the section loaded with nothing in it. */
	empty?: string
	isEmpty: boolean
	children: ReactNode
}

/**
 * One block of the open-month review: a title, then the loading skeleton, the error with
 * Retry, an empty line, or the rows. Sections load and fail on their own (M-02).
 */
export function ReviewSection({
	title,
	hint,
	isLoading,
	isError,
	error,
	errorTitle,
	onRetry,
	empty,
	isEmpty,
	children
}: ReviewSectionProps) {
	const headingId = `review-${title.toLowerCase().replace(/\W+/g, "-")}`

	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-2">
			<div className="flex flex-col gap-0.5">
				<h3 id={headingId} className="font-semibold text-foreground text-sm">
					{title}
				</h3>
				{hint && <p className="text-muted-foreground text-xs">{hint}</p>}
			</div>
			{isError ? (
				<div
					role="alert"
					className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
				>
					<div className="min-w-0">
						<p className="font-medium text-foreground text-sm">{errorTitle}</p>
						<p className="text-muted-foreground text-xs">
							{getApiErrorMessage(error, { action: "mutate" })}
						</p>
					</div>
					<Button type="button" variant="outline" onClick={onRetry}>
						{translations.month.states.retry}
					</Button>
				</div>
			) : isLoading ? (
				<div role="status" className="flex flex-col gap-2">
					<span className="sr-only">
						{translations.month.review.loading} {title}
					</span>
					<Skeleton className="h-12" />
					<Skeleton className="h-12" />
				</div>
			) : isEmpty ? (
				<p className="rounded-xl border border-border border-dashed px-3 py-3 text-muted-foreground text-sm">
					{empty}
				</p>
			) : (
				children
			)}
		</section>
	)
}
