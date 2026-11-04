import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
	"inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
	{
		variants: {
			variant: {
				default: "bg-background text-muted-foreground",
				primary: "bg-primary-soft text-primary-text",
				success: "bg-success-soft text-success",
				danger: "bg-danger-soft text-danger"
			}
		},
		defaultVariants: {
			variant: "default"
		}
	}
)

export interface BadgeProps
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof badgeVariants> {
	asChild?: boolean
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
	({ className, variant, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "span"
		return (
			<Comp
				ref={ref}
				className={cn(badgeVariants({ variant }), className)}
				{...props}
			/>
		)
	}
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
