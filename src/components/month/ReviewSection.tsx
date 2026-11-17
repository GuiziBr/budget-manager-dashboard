import { type ReactNode, useEffect, useState } from "react"
import {
	CollapseHeader,
	CollapsibleBody
} from "@/components/month/CollapsibleSection"
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
	/** Something inside needs attention (an error, an invalid amount): a hidden section opens. */
	attention?: boolean
	/** Whether the section starts hidden. */
	defaultCollapsed?: boolean
	children: ReactNode
}

/**
 * One block of the open-month review: a title with a Hide / Show button (like the Categories card;
 * the choice isn't remembered, each review starts from the defaults), then the loading skeleton, the error with
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
	attention = false,
	defaultCollapsed = false,
	children
}: ReviewSectionProps) {
	const slug = title.toLowerCase().replace(/\W+/g, "-")
	const headingId = `review-${slug}`
	const [collapsed, setCollapsed] = useState(defaultCollapsed)

	// A hidden section opens when a problem appears in it, so it can't go unseen. The user can
	// hide it again afterwards.
	// Each cause is watched on its own, so a new load error opens the section even while an
	// invalid amount already had it flagged
	useEffect(() => {
		if (isError) setCollapsed(false)
	}, [isError])
	useEffect(() => {
		if (attention) setCollapsed(false)
	}, [attention])

	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-2">
			<CollapseHeader
				as="h3"
				collapsed={collapsed}
				controls={`${headingId}-body`}
				onToggle={() => setCollapsed(!collapsed)}
			>
				<span id={headingId} className="font-semibold text-foreground text-sm">
					{title}
				</span>
			</CollapseHeader>
			<CollapsibleBody id={`${headingId}-body`} collapsed={collapsed}>
				<div className="flex flex-col gap-2">
					{hint && <p className="text-muted-foreground text-xs">{hint}</p>}
					{isError ? (
						<div
							role="alert"
							className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
						>
							<div className="min-w-0">
								<p className="font-medium text-foreground text-sm">
									{errorTitle}
								</p>
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
				</div>
			</CollapsibleBody>
		</section>
	)
}
