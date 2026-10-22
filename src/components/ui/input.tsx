import { AlertCircle, LucideIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	icon?: LucideIcon | React.ElementType
	error?: string
	isCurrency?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, icon: Icon, error, isCurrency, onChange, ...props }, ref) => {
		const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			let { value } = e.target
			value = value.replace(/\D/g, "")
			value = value.replace(/(\d)(\d{2})$/, "$1.$2")
			value = value.replace(/(?=(\d{3})+(\D))\B/g, ",")
			e.target.value = value
			onChange?.(e)
		}

		return (
			<div
				className={cn(
					"flex h-10 w-full items-center rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-xs transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30",
					error && "border-danger text-danger",
					className
				)}
			>
				{Icon && <Icon className="mr-2 size-4 text-muted-foreground shrink-0" />}
				<input
					type={type}
					className="flex-1 bg-transparent border-none p-0 h-full w-full text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
					ref={ref}
					{...props}
					onChange={isCurrency ? handleCurrencyChange : onChange}
				/>
				{error && (
					<div className="relative flex items-center group ml-2 h-5 shrink-0">
						<AlertCircle className="h-5 w-5 text-danger" />
						<span
							role="alert"
							className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg"
						>
							{error}
							<div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-t-destructive border-x-transparent border-b-transparent" />
						</span>
					</div>
				)}
			</div>
		)
	}
)
Input.displayName = "Input"

export { Input }
