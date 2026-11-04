import * as React from "react"

import { cn } from "@/lib/utils"

// Decorative: the parent's loading state is what gets announced.
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			aria-hidden="true"
			className={cn("animate-pulse rounded-lg bg-muted", className)}
			{...props}
		/>
	)
}

export { Skeleton }
