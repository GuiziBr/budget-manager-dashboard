import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FormFieldProps {
	/** The id of the control inside; the label and the error message point at it. */
	id: string
	label: string
	/** Adds the red asterisk. The control itself should carry `aria-required`. */
	required?: boolean
	/**
	 * Why the field is invalid. Only screen readers get the text; sighted users see the
	 * control's red border, which the caller sets.
	 */
	error?: string
	className?: string
	children: ReactNode
}

/** The id of a field's error message, for the control's `aria-describedby`. */
export const fieldErrorId = (id: string) => `${id}-error`

/** A label (with the required mark), the control, and its error message. */
export function FormField({
	id,
	label,
	required,
	error,
	className,
	children
}: FormFieldProps) {
	return (
		<div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
			<div className="flex items-center gap-0.5">
				<label htmlFor={id} className="font-medium text-sm text-foreground">
					{label}
				</label>
				{required && (
					<span aria-hidden="true" className="font-semibold text-sm text-danger">
						*
					</span>
				)}
			</div>
			{children}
			{error && (
				<p id={fieldErrorId(id)} role="alert" className="sr-only">
					{error}
				</p>
			)}
		</div>
	)
}
