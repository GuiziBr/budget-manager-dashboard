"use client"

import { CheckCircle2, XCircle } from "lucide-react"
import type { ToasterProps } from "sonner"
import { Toaster as Sonner } from "sonner"
import { useTheme } from "@/providers/theme-provider"

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme } = useTheme()

	return (
		<Sonner
			theme={theme}
			className="toaster group"
			toastOptions={{
				classNames: {
					toast:
						"group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg group-[.toaster]:p-4",
					description: "group-[.toast]:text-muted-foreground",
					actionButton:
						"group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
					cancelButton:
						"group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
					success: "group-[.toast]:text-success",
					error: "group-[.toast]:text-danger"
				}
			}}
			icons={{
				success: <CheckCircle2 className="h-5 w-5 text-success" />,
				error: <XCircle className="h-5 w-5 text-danger" />
			}}
			{...props}
		/>
	)
}

export { Toaster }
