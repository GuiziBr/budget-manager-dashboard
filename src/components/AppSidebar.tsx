"use client"

import { Moon, Sun, Wallet } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useId } from "react"
import { translations } from "@/constants/translations"
import { isNavItemActive, NAV_GROUPS } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { useTheme } from "@/providers/theme-provider"

const ITEM_CLASS =
	"flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium no-underline transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"

const itemClass = (isActive: boolean) =>
	cn(
		ITEM_CLASS,
		isActive
			? "bg-primary-soft font-semibold text-primary-text"
			: "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
	)

function ThemeToggle() {
	const { theme, toggleTheme } = useTheme()
	const isDark = theme === "dark"
	const Icon = isDark ? Sun : Moon

	return (
		<button
			type="button"
			onClick={toggleTheme}
			className={cn(itemClass(false), "cursor-pointer")}
		>
			<Icon className="size-[18px] shrink-0" aria-hidden="true" />
			{isDark
				? translations.theme.switchToLight
				: translations.theme.switchToDark}
		</button>
	)
}

export function AppSidebar({ className }: { className?: string }) {
	const pathname = usePathname()
	const groupId = useId()

	return (
		<aside
			className={cn(
				"flex h-full w-[248px] shrink-0 flex-col gap-1 border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground",
				className
			)}
		>
			<div className="flex items-center gap-2.5 px-2 pb-5">
				<span
					aria-hidden="true"
					className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
				>
					<Wallet className="size-[18px]" />
				</span>
				<span className="text-[17px] font-bold tracking-tight">
					{translations.common.appName}
				</span>
			</div>

			<nav
				aria-label={translations.navigation.mainLabel}
				className="flex-1 overflow-y-auto"
			>
				{NAV_GROUPS.map((group) => {
					const titleId = `${groupId}-${group.id}`
					return (
						<div key={group.id}>
							<p
								id={titleId}
								className="px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
							>
								{group.label}
							</p>
							<ul aria-labelledby={titleId} className="space-y-1">
								{group.items.map((item) => {
									const Icon = item.icon
									const isActive = isNavItemActive(pathname, item.href)
									return (
										<li key={item.href}>
											<Link
												href={item.href}
												aria-current={isActive ? "page" : undefined}
												className={itemClass(isActive)}
											>
												<Icon
													className="size-[18px] shrink-0"
													aria-hidden="true"
												/>
												{item.label}
											</Link>
										</li>
									)
								})}
							</ul>
						</div>
					)
				})}
			</nav>

			<ThemeToggle />
		</aside>
	)
}
