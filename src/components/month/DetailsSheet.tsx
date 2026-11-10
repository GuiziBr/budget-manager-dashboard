"use client"

import { type LucideIcon, X } from "lucide-react"
import { Children, type ReactNode, type RefObject } from "react"
import { Button } from "@/components/ui/button"
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle
} from "@/components/ui/sheet"
import { translations } from "@/constants/translations"
import { PHONE_QUERY, useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

interface DetailsSheetProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** Shown above the title (the type chip). */
	eyebrow?: ReactNode
	/** Buttons placed to the left of Close, at the top right. */
	headerActions?: ReactNode
	title: string
	/** Read by screen readers only. */
	description: string
	/** The row or tile that opened the sheet; it gets the focus back on close. */
	returnFocusRef?: RefObject<HTMLElement | null>
	children: ReactNode
}

/**
 * The frame shared by the expense and envelope details: a panel from the right
 * on desktop and a bottom sheet on the phone, like the income panel (M-07, M-08).
 */
export function DetailsSheet({
	open,
	onOpenChange,
	eyebrow,
	headerActions,
	title,
	description,
	returnFocusRef,
	children
}: DetailsSheetProps) {
	const isPhone = useMediaQuery(PHONE_QUERY)

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side={isPhone ? "bottom" : "right"}
				// Land on the panel itself, not on the first button
				onOpenAutoFocus={(event) => {
					event.preventDefault()
					;(event.currentTarget as HTMLElement | null)?.focus()
				}}
				onCloseAutoFocus={(event) => {
					const opener = returnFocusRef?.current
					if (!opener?.isConnected) return
					event.preventDefault()
					opener.focus()
				}}
				showCloseButton={false}
				className={cn(
					"gap-4 overflow-y-auto pt-5 pb-0 outline-none",
					isPhone ? "max-h-[85dvh] rounded-t-[20px]" : "w-full sm:max-w-[440px]"
				)}
			>
				{/* The title starts at the left edge like the rest of the panel, the chip under it; the buttons sit on the title's line */}
				<div className="flex items-start gap-3 px-5">
					<SheetHeader className="min-w-0 flex-1 gap-1 p-0">
						<SheetTitle className="flex min-h-8 min-w-0 items-center break-words text-lg">
							{title}
						</SheetTitle>
						{eyebrow && <div className="flex">{eyebrow}</div>}
						<SheetDescription className="sr-only">
							{description}
						</SheetDescription>
					</SheetHeader>
					<div className="flex shrink-0 items-center gap-2">
						{headerActions}
						<SheetClose asChild>
							<Button
								variant="outline"
								size="icon"
								className="size-8 rounded-[10px] shadow-none"
							>
								<X className="size-4" aria-hidden="true" />
								<span className="sr-only">
									{translations.month.details.close}
								</span>
							</Button>
						</SheetClose>
					</div>
				</div>
				{children}
			</SheetContent>
		</Sheet>
	)
}

/** Every row is at least this tall (px), so a card's height is a known number of rows. */
const FIELD_HEIGHT = 42

/** A titled group of label / value lines. */
export function DetailsSection({
	title,
	minRows,
	children
}: {
	/** Left out where a tab already names the group. */
	title?: string
	/** Keeps the card at least this many rows tall, so switching tabs doesn't resize the sheet. */
	minRows?: number
	children: ReactNode
}) {
	return (
		<section className="flex flex-col gap-2.5">
			{title && (
				<h3 className="font-semibold text-[13px] text-muted-foreground">
					{title}
				</h3>
			)}
			<dl
				className={cn(
					"flex flex-col rounded-xl border border-border bg-card px-4",
					// The card is taller than its rows, so the last row keeps its separator
					minRows &&
						Children.toArray(children).length < minRows &&
						"[&>div:last-child]:border-b"
				)}
				style={
					minRows ? { minHeight: `${minRows * FIELD_HEIGHT + 2}px` } : undefined
				}
			>
				{children}
			</dl>
		</section>
	)
}

export function DetailsField({
	label,
	children
}: {
	label: string
	children: ReactNode
}) {
	return (
		<div className="flex min-h-[42px] items-center justify-between gap-4 border-border border-b py-2.5 last:border-b-0">
			<dt className="text-muted-foreground text-sm">{label}</dt>
			<dd className="m-0 min-w-0 break-words text-right font-medium text-foreground text-sm">
				{children}
			</dd>
		</div>
	)
}

/** Previous / next arrow in the header; disabled when there is nowhere to go. */
export function StepButton({
	label,
	icon: Icon,
	onStep
}: {
	label: string
	icon: LucideIcon
	onStep: (() => void) | undefined
}) {
	return (
		<Button
			variant="outline"
			size="icon"
			disabled={!onStep}
			onClick={onStep}
			className="size-8 rounded-[10px] shadow-none"
		>
			<Icon className="size-4" aria-hidden="true" />
			<span className="sr-only">{label}</span>
		</Button>
	)
}

/** "(2/10)" for sighted users, the full sentence for screen readers. */
export function PositionCounter({
	ordinal,
	total,
	label
}: {
	ordinal: number
	total: number
	label: string
}) {
	return (
		<span className="mr-1 text-base text-muted-foreground tabular-nums">
			<span aria-hidden="true">
				({ordinal}/{total})
			</span>
			<span className="sr-only">
				{label
					.replace("{n}", String(ordinal))
					.replace("{total}", String(total))}
			</span>
		</span>
	)
}
