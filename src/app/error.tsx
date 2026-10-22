"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { translations } from "@/constants/translations"

export default function ErrorPage({
	error,
	reset
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error(error)
	}, [error])

	return (
		<div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4 text-center">
			<h1 className="text-2xl font-semibold">
				{translations.errorBoundary.title}
			</h1>
			<p className="text-muted-foreground max-w-md">
				{translations.errorBoundary.description}
			</p>
			<Button onClick={reset}>{translations.errorBoundary.retry}</Button>
		</div>
	)
}
