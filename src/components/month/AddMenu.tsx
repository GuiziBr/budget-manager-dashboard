"use client"

import type { LucideIcon } from "lucide-react"
import { Banknote, ChevronDown, Plus, Receipt, Wallet } from "lucide-react"
import { useRef } from "react"
import { AddFab } from "@/components/month/AddFab"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { translations } from "@/constants/translations"

const t = translations.month.addMenu

/** What + Add can create. An entry shows only when its handler is given. */
export interface AddMenuActions {
	onAddExpense?: (opener: HTMLElement | null) => void
	onAddIncome?: (opener: HTMLElement | null) => void
	onAddEnvelope?: (opener: HTMLElement | null) => void
}

interface Entry {
	key: "expense" | "income" | "envelope"
	icon: LucideIcon
	label: string
	hint: string
	run: (opener: HTMLElement | null) => void
}

function entriesFor({
	onAddExpense,
	onAddIncome,
	onAddEnvelope
}: AddMenuActions): Entry[] {
	const entries: (Entry | null)[] = [
		onAddExpense
			? { key: "expense", icon: Receipt, ...t.expense, run: onAddExpense }
			: null,
		onAddIncome
			? { key: "income", icon: Banknote, ...t.income, run: onAddIncome }
			: null,
		onAddEnvelope
			? { key: "envelope", icon: Wallet, ...t.envelope, run: onAddEnvelope }
			: null
	]
	return entries.filter((entry): entry is Entry => entry !== null)
}

function EntryBody({ entry }: { entry: Entry }) {
	const Icon = entry.icon
	return (
		<>
			<Icon className="size-[18px] shrink-0" aria-hidden="true" />
			<span className="flex min-w-0 flex-col">
				<span className="font-semibold text-foreground text-sm">
					{entry.label}
				</span>
				<span className="font-normal text-muted-foreground text-xs">
					{entry.hint}
				</span>
			</span>
		</>
	)
}

/** The desktop **Add** button in the month header, with the list of things to add. */
export function AddMenu(actions: AddMenuActions) {
	const trigger = useRef<HTMLButtonElement>(null)
	const entries = entriesFor(actions)
	if (entries.length === 0) return null

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button ref={trigger} className="rounded-[10px] shadow-none">
					<Plus className="size-4" aria-hidden="true" />
					{t.trigger}
					{/* The split: the word on one side, the menu arrow on the other */}
					<span
						aria-hidden="true"
						className="mr-1.5 ml-3 h-[18px] w-px bg-primary-foreground/25"
					/>
					<ChevronDown className="size-3.5 opacity-80" aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60 gap-0.5 p-1.5">
				{entries.map((entry) => (
					<DropdownMenuItem
						key={entry.key}
						className="items-center gap-3 rounded-lg px-2.5 py-2.5"
						// The form takes the focus itself; give it back to the button afterwards
						onSelect={() => entry.run(trigger.current)}
					>
						<EntryBody entry={entry} />
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

/**
 * The phone's floating add button with its menu above it. A dim layer covers the page
 * while the menu is open and the button turns into a close button.
 */
export function AddFabMenu(
	actions: AddMenuActions & {
		open: boolean
		onOpenChange: (open: boolean) => void
	}
) {
	const { open, onOpenChange, ...handlers } = actions
	const fab = useRef<HTMLButtonElement>(null)
	const entries = entriesFor(handlers)
	if (entries.length === 0) return null

	return (
		<>
			{open && (
				<div
					aria-hidden="true"
					className="fixed inset-0 z-20 bg-black/50"
					data-testid="add-menu-scrim"
				/>
			)}
			<Popover open={open} onOpenChange={onOpenChange}>
				<PopoverAnchor asChild>
					<AddFab ref={fab} open={open} onAdd={() => onOpenChange(!open)} />
				</PopoverAnchor>
				<PopoverContent
					side="top"
					align="end"
					sideOffset={12}
					role="menu"
					className="z-40 flex w-60 flex-col gap-0.5 p-1.5"
					// A press on the button itself is handled by the button, which closes the menu
					onInteractOutside={(event) => {
						if (fab.current?.contains(event.target as Node))
							event.preventDefault()
					}}
					onCloseAutoFocus={(event) => {
						event.preventDefault()
						fab.current?.focus()
					}}
				>
					{entries.map((entry) => (
						<button
							key={entry.key}
							type="button"
							role="menuitem"
							className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-muted-foreground outline-none hover:bg-accent focus-visible:bg-accent"
							onClick={() => {
								onOpenChange(false)
								entry.run(fab.current)
							}}
						>
							<EntryBody entry={entry} />
						</button>
					))}
				</PopoverContent>
			</Popover>
		</>
	)
}
