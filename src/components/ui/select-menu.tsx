"use client"

import { AlertCircle, Check, ChevronDown } from "lucide-react"
import { Select as SelectPrimitive } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

export interface SelectOption {
	id: string
	description?: string
	name?: string
	has_statement?: boolean
}

export interface SelectMenuProps {
	options: SelectOption[]
	value: string
	onValueChange: (value: string) => void
	onBlur?: () => void
	placeholder?: string
	name?: string
	id?: string
	disabled?: boolean
	error?: string
	/** Red border for a message shown elsewhere (under the field), without the tooltip icon. */
	invalid?: boolean
	/** Adds an entry that empties the field (an optional field); picking it gives `""`. */
	clearLabel?: string
	/** The id of the text that explains the field (its error), read with the trigger. */
	"aria-describedby"?: string
	className?: string
}

// Radix Select can't hold an item with an empty value, so "no choice" uses a stand-in
const CLEAR_VALUE = "__clear__"

const getLabel = (option: SelectOption) => option.description || option.name

/**
 * A select that renders its own popover list (Radix Select) instead of the
 * operating system's picker, so the menu follows the app theme. `className`
 * sizes the whole field (width, flex). The ref points at the trigger button, so
 * react-hook-form can focus it when the field is invalid.
 */
export const SelectMenu = React.forwardRef<
	HTMLButtonElement,
	SelectMenuProps
>(function SelectMenu(
	{
		options,
		value,
		onValueChange,
		onBlur,
		placeholder,
		name,
		id,
		disabled,
		error,
		invalid,
		clearLabel,
		className,
		"aria-describedby": ariaDescribedBy
	},
	ref
) {
	return (
		<div className={cn("relative w-full min-w-0", className)}>
			<SelectPrimitive.Root
				value={value}
				onValueChange={(next) =>
					onValueChange(next === CLEAR_VALUE ? "" : next)
				}
				name={name}
				disabled={disabled}
			>
				<SelectPrimitive.Trigger
					ref={ref}
					id={id}
					onBlur={onBlur}
					aria-invalid={!!error || invalid}
					aria-describedby={ariaDescribedBy}
					className={cn(
						"flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-3 text-left text-sm text-foreground shadow-xs outline-none transition-colors",
						"focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30",
						"data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-ring/30",
						"data-[placeholder]:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
						error && "pr-14",
						(error || invalid) && "border-danger"
					)}
				>
					<span className="min-w-0 flex-1 truncate">
						<SelectPrimitive.Value placeholder={placeholder} />
					</span>
					<SelectPrimitive.Icon asChild>
						<ChevronDown
							className="size-4 shrink-0 text-muted-foreground"
							aria-hidden="true"
						/>
					</SelectPrimitive.Icon>
				</SelectPrimitive.Trigger>

				<SelectPrimitive.Portal>
					<SelectPrimitive.Content
						position="popper"
						sideOffset={6}
						align="start"
						className={cn(
							"z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md",
							"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
						)}
					>
						<SelectPrimitive.Viewport className="p-1">
							{clearLabel && (
								<SelectPrimitive.Item
									value={CLEAR_VALUE}
									className="relative flex w-full cursor-pointer items-center rounded-md py-2 pr-8 pl-2 text-muted-foreground text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground"
								>
									<SelectPrimitive.ItemText>{clearLabel}</SelectPrimitive.ItemText>
								</SelectPrimitive.Item>
							)}
							{options.map((option) => (
								<SelectPrimitive.Item
									key={option.id}
									value={option.id}
									className="relative flex w-full cursor-pointer items-center rounded-md py-2 pr-8 pl-2 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
								>
									<SelectPrimitive.ItemText>
										{getLabel(option)}
									</SelectPrimitive.ItemText>
									<SelectPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
										<Check
											className="size-4 text-primary-text"
											aria-hidden="true"
										/>
									</SelectPrimitive.ItemIndicator>
								</SelectPrimitive.Item>
							))}
						</SelectPrimitive.Viewport>
					</SelectPrimitive.Content>
				</SelectPrimitive.Portal>
			</SelectPrimitive.Root>

			{error && (
				<span className="group absolute top-1/2 right-9 flex h-5 -translate-y-1/2 items-center">
					<AlertCircle className="size-4 text-danger" aria-hidden="true" />
					<span
						role="alert"
						className="pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-destructive px-2 py-1 text-xs text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
					>
						{error}
						<span className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-t-destructive border-x-transparent border-b-transparent" />
					</span>
				</span>
			)}
		</div>
	)
})
