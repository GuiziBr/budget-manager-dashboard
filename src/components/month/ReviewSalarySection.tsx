import { DollarSign, Plus, X } from "lucide-react"
import { ReviewSection } from "@/components/month/ReviewSection"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { translations } from "@/constants/translations"
import { getApiErrorMessage } from "@/lib/api-error-message"
import { formatMoneyInput } from "@/lib/money"
import type { SalaryRow } from "@/lib/review-salary"

const t = translations.month.review.salary

interface ReviewSalarySectionProps {
	/** The salaries to create: last month's to start with, then whatever the user changes. */
	rows: readonly SalaryRow[]
	/** At least one of the rows was copied from last month: a hint says so. */
	copied: boolean
	isLoading: boolean
	/** Last month's incomes couldn't be read: salaries can still be added by hand. */
	loadError: unknown
	onRetryLoad: () => void
	onChange: (id: string, patch: Partial<Omit<SalaryRow, "id">>) => void
	onAdd: () => void
	onRemove: (id: string) => void
	/** Something in the section needs attention, so it opens if it was hidden. */
	attention: boolean
	/** Keys whose amount isn't valid, and keys already saved (locked). */
	invalidKeys: ReadonlySet<string>
	savedKeys: ReadonlySet<string>
	/** Salaries that couldn't be saved, named in the alert. */
	failedNames: readonly string[]
	onRetrySave: () => void
	disabled: boolean
}

/**
 * The review's Income section (M-02): a row per salary, starting with last month's
 * (description and amount), each editable and removable, plus **Add salary** for more.
 * Done creates what is left; a row with no amount is skipped.
 */
export function ReviewSalarySection({
	rows,
	copied,
	isLoading,
	loadError,
	onRetryLoad,
	onChange,
	onAdd,
	onRemove,
	attention,
	invalidKeys,
	savedKeys,
	failedNames,
	onRetrySave,
	disabled
}: ReviewSalarySectionProps) {
	const hasLoadError = loadError !== null && loadError !== undefined

	return (
		<ReviewSection
			title={t.title}
			isLoading={isLoading}
			isError={false}
			errorTitle={t.loadError}
			onRetry={onRetryLoad}
			isEmpty={false}
			attention={attention || hasLoadError}
		>
			<div className="flex flex-col gap-3">
				{hasLoadError && (
					<div
						role="alert"
						className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
					>
						<div className="min-w-0">
							<p className="font-medium text-foreground text-sm">
								{t.loadError}
							</p>
							<p className="text-muted-foreground text-xs">
								{getApiErrorMessage(loadError, { action: "mutate" })}
							</p>
						</div>
						<Button type="button" variant="outline" onClick={onRetryLoad}>
							{t.retry}
						</Button>
					</div>
				)}

				{copied && (
					<p className="text-muted-foreground text-xs">{t.copiedHint}</p>
				)}

				{rows.length > 0 && (
					<ul className="flex flex-col gap-2">
						{rows.map((row, index) => {
							const invalid = invalidKeys.has(row.id)
							const locked = disabled || savedKeys.has(row.id)
							const number = index + 1
							return (
								<li
									key={row.id}
									className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5"
								>
									<Input
										value={row.description}
										onChange={(event) =>
											onChange(row.id, { description: event.target.value })
										}
										placeholder={t.descriptionPlaceholder}
										autoComplete="off"
										disabled={locked}
										aria-label={t.descriptionLabel.replace(
											"{n}",
											String(number)
										)}
										className="min-w-0 flex-1"
									/>
									<Input
										value={row.amount}
										onChange={(event) =>
											onChange(row.id, {
												amount: formatMoneyInput(event.target.value)
											})
										}
										icon={DollarSign}
										inputMode="numeric"
										autoComplete="off"
										placeholder="0.00"
										disabled={locked}
										aria-label={t.amountLabel.replace("{n}", String(number))}
										aria-invalid={invalid}
										className={
											invalid
												? "w-36 shrink-0 border-danger focus-within:border-danger sm:w-40"
												: "w-36 shrink-0 sm:w-40"
										}
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										disabled={locked}
										onClick={() => onRemove(row.id)}
										aria-label={t.removeLabel.replace("{n}", String(number))}
									>
										<X className="size-4" aria-hidden="true" />
									</Button>
								</li>
							)
						})}
					</ul>
				)}

				<Button
					type="button"
					variant="outline"
					className="self-start"
					disabled={disabled}
					onClick={onAdd}
				>
					<Plus className="size-4" aria-hidden="true" />
					{t.addSalary}
				</Button>

				{failedNames.length > 0 && (
					<div
						role="alert"
						className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger px-3 py-2.5"
					>
						<p className="text-danger text-sm">
							{t.saveFailed.replace("{names}", failedNames.join(", "))}
						</p>
						<Button
							type="button"
							variant="outline"
							onClick={onRetrySave}
							disabled={disabled}
						>
							{t.retry}
						</Button>
					</div>
				)}
			</div>
		</ReviewSection>
	)
}
