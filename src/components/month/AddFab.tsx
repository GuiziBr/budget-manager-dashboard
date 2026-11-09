"use client"

import { Plus } from "lucide-react"
import { translations } from "@/constants/translations"

interface AddFabProps {
	/** Opens the + Add menu (wired in T-26). Until then the button does nothing. */
	onAdd?: () => void
}

/** The phone's floating add button, above the bottom tab bar. The caller shows it only where editing is allowed. */
export function AddFab({ onAdd }: AddFabProps) {
	return (
		<button
			type="button"
			onClick={onAdd}
			aria-label={translations.month.table.addButton}
			className="fixed right-4 bottom-24 z-30 flex size-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
		>
			<Plus className="size-6" aria-hidden="true" />
		</button>
	)
}
