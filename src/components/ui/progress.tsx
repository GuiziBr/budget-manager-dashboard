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
	extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
		VariantProps<typeof indicatorVariants> {}

// The value is clamped to 0-100, so an over-budget ratio just shows a full bar.
const Progress = React.forwardRef<
	React.ComponentRef<typeof ProgressPrimitive.Root>,
	ProgressProps
>(({ className, value, variant, ...props }, ref) => {
	const clamped = Math.min(100, Math.max(0, value ?? 0))
	return (
		<ProgressPrimitive.Root
			ref={ref}
			value={clamped}
			className={cn(
				"relative h-2 w-full overflow-hidden rounded-full bg-muted",
				className
			)}
			{...props}
		>
			<ProgressPrimitive.Indicator
				data-variant={variant ?? "default"}
				className={indicatorVariants({ variant })}
				style={{ transform: `translateX(-${100 - clamped}%)` }}
			/>
		</ProgressPrimitive.Root>
	)
})
Progress.displayName = "Progress"

export { Progress }
