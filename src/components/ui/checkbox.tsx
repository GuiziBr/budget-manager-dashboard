"use client"

import { Check } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

// The box is 20px. The pseudo-element grows the hit area to 44px below `lg`
// (touch) and 28px from `lg`, without changing the row height.
const Checkbox = React.forwardRef<
	React.ComponentRef<typeof CheckboxPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
	<CheckboxPrimitive.Root
		ref={ref}
		className={cn(
			"relative flex size-5 shrink-0 cursor-pointer items-center justify-center rounded border-2 border-muted-foreground text-primary-foreground transition-colors before:absolute before:-inset-3 before:content-[''] lg:before:-inset-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary",
			className
		)}
		{...props}
	>
		<CheckboxPrimitive.Indicator className="flex items-center justify-center">
			<Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
		</CheckboxPrimitive.Indicator>
	</CheckboxPrimitive.Root>
))
Checkbox.displayName = "Checkbox"

export { Checkbox }
