import { Button } from "@/components/ui/button"
import { translations } from "@/constants/translations"

interface MonthNotOpenedProps {
	label: string
	/** Wired to the open-month request in T-35; the button stays disabled without it. */
	onOpen?: () => void
	isOpening?: boolean
}

export function MonthNotOpened({
	label,
	onOpen,
	isOpening
}: MonthNotOpenedProps) {
	const t = translations.month.states

	return (
		<div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card px-4 py-12 text-center">
			<p className="font-serif text-xl font-bold text-foreground">
				{t.notOpenedTitle.replace("{month}", label)}
			</p>
			<Button onClick={onOpen} disabled={!onOpen || isOpening}>
				{t.openMonth.replace("{month}", label)}
			</Button>
		</div>
	)
}
