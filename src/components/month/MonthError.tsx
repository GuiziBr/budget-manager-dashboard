import { Button } from "@/components/ui/button"
import { translations } from "@/constants/translations"
import { getApiErrorMessage } from "@/lib/api-error-message"

interface MonthErrorProps {
	error: unknown
	onRetry: () => void
}

export function MonthError({ error, onRetry }: MonthErrorProps) {
	const t = translations.month.states

	return (
		<div
			role="alert"
			className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-4 py-12 text-center"
		>
			<p className="font-medium text-foreground">{t.errorTitle}</p>
			<p className="text-sm text-muted-foreground">
				{getApiErrorMessage(error, { action: "mutate" })}
			</p>
			<Button variant="outline" onClick={onRetry}>
				{t.retry}
			</Button>
		</div>
	)
}
