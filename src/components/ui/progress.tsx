"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { Progress as ProgressPrimitive } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

const indicatorVariants = cva("h-full w-full transition-transform", {
	variants: {
		variant: {
			default: "bg-primary",
			danger: "bg-danger"
		}
	},
	defaultVariants: {
		variant: "default"
	}
})

export interface ProgressProps
	extends Omit<
			React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
			"asChild" | "children"
		>,
		VariantProps<typeof indicatorVariants> {}

// A numeric value is clamped to 0-max, so an over-budget ratio just shows a
// full bar; `null` (or no value) is passed through as Radix's indeterminate
// state instead of being forced to 0.
const Progress = React.forwardRef<
	React.ComponentRef<typeof ProgressPrimitive.Root>,
	ProgressProps
>(({ className, value, max = 100, variant, ...props }, ref) => {
	const clamped = value == null ? null : Math.min(max, Math.max(0, value))
	return (
		<ProgressPrimitive.Root
			ref={ref}
			value={clamped}
			max={max}
			className={cn(
				"relative h-2 w-full overflow-hidden rounded-full bg-muted",
				className
			)}
			{...props}
		>
			<ProgressPrimitive.Indicator
				data-variant={variant ?? "default"}
				className={indicatorVariants({ variant })}
				style={
					clamped == null
						? undefined
						: { transform: `translateX(-${100 - (clamped / max) * 100}%)` }
				}
			/>
		</ProgressPrimitive.Root>
	)
})
Progress.displayName = "Progress"

export { Progress }
