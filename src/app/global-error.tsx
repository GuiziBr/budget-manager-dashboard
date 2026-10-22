"use client"

import { useEffect } from "react"
import { translations } from "@/constants/translations"

export default function GlobalError({
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
		<html lang="en" className="dark">
			<body>
				<div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4 text-center">
					<h1 className="text-2xl font-semibold">
						{translations.errorBoundary.title}
					</h1>
					<p className="text-muted-foreground max-w-md">
						{translations.errorBoundary.description}
					</p>
					<button
						type="button"
						onClick={reset}
						className="h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
					>
						{translations.errorBoundary.retry}
					</button>
				</div>
			</body>
		</html>
	)
}
