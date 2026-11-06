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
		<div className="flex min-h-[93px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-4 text-center sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
			<p className="font-serif text-base font-bold text-foreground">
				{t.notOpenedTitle.replace("{month}", label)}
			</p>
			<Button onClick={onOpen} disabled={!onOpen || isOpening}>
				{t.openMonth.replace("{month}", label)}
			</Button>
		</div>
	)
}
