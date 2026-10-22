"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoaderProps {
	className?: string
	size?: number | string
}

export function Loader({ className, size = 24 }: LoaderProps) {
	return (
		<div className={cn("flex items-center justify-center p-4", className)}>
			<Loader2
				className="animate-spin text-primary-text"
				size={size}
				strokeWidth={2}
			/>
		</div>
	)
}
