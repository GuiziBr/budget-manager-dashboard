"use client"

import { Ellipsis, Moon, Sun } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger
} from "@/components/ui/sheet"
import { translations } from "@/constants/translations"
import {
	isMoreTabActive,
	isNavItemActive,
	MOBILE_TAB_ITEMS,
	MORE_NAV_ITEMS,
	type NavItem
} from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { useTheme } from "@/providers/theme-provider"

const TAB_CLASS =
	"flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-[11px] no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"

const tabClass = (isActive: boolean) =>
	cn(
		TAB_CLASS,
		isActive
			? "font-semibold text-primary-text"
			: "font-medium text-muted-foreground"
	)

function SheetLink({
	item,
	isActive,
	onNavigate
}: {
	item: NavItem
	isActive: boolean
	onNavigate: () => void
}) {
	const Icon = item.icon
	return (
		<Link
			href={item.href}
			onClick={onNavigate}
			aria-current={isActive ? "page" : undefined}
			className={cn(
				"flex h-12 items-center gap-3 rounded-lg px-3 text-base font-medium no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring",
				isActive
					? "bg-primary-soft font-semibold text-primary-text"
					: "text-foreground"
			)}
		>
			<Icon className="size-5 shrink-0" aria-hidden="true" />
			{item.label}
		</Link>
	)
}

export function BottomTabBar({ className }: { className?: string }) {
	const pathname = usePathname()
	const { theme, toggleTheme } = useTheme()
	const isDark = theme === "dark"
	const [isMoreOpen, setIsMoreOpen] = useState(false)
	const isMoreActive = isMoreTabActive(pathname)

	useEffect(() => {
		setIsMoreOpen(false)
	}, [pathname])

	const closeSheet = () => setIsMoreOpen(false)

	return (
		<nav
			aria-label={translations.navigation.tabBarLabel}
			className={cn(
				"fixed inset-x-0 bottom-0 z-40 grid grid-flow-col auto-cols-fr gap-1 border-t border-border bg-card px-3 pt-2.5 pb-[max(env(safe-area-inset-bottom),0.75rem)]",
				className
			)}
		>
			{MOBILE_TAB_ITEMS.map((item) => {
				const Icon = item.icon
				const isActive = isNavItemActive(pathname, item.href)
				return (
					<Link
						key={item.href}
						href={item.href}
						aria-current={isActive ? "page" : undefined}
						className={tabClass(isActive)}
					>
						<Icon className="size-[22px]" aria-hidden="true" />
						{item.label}
					</Link>
				)
			})}

			<Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
				<SheetTrigger asChild>
					<button
						type="button"
						data-active={isMoreActive}
						className={cn(tabClass(isMoreActive), "cursor-pointer")}
					>
						<Ellipsis className="size-[22px]" aria-hidden="true" />
						{translations.navigation.tabs.more}
					</button>
				</SheetTrigger>
				<SheetContent
					side="bottom"
					aria-describedby={undefined}
					className="max-h-[85vh] gap-0 overflow-y-auto rounded-t-2xl bg-card px-3 pb-[max(env(safe-area-inset-bottom),1rem)]"
				>
					<SheetHeader className="px-3">
						<SheetTitle>{translations.navigation.tabs.more}</SheetTitle>
					</SheetHeader>

					{MORE_NAV_ITEMS.length > 0 && (
						<ul className="space-y-1">
							{MORE_NAV_ITEMS.map((item) => (
								<li key={item.href}>
									<SheetLink
										item={item}
										isActive={isNavItemActive(pathname, item.href)}
										onNavigate={closeSheet}
									/>
								</li>
							))}
						</ul>
					)}

					<div className="mt-3 border-t border-border pt-3">
						{/* Stays open on tap so the change is visible right away */}
						<button
							type="button"
							onClick={toggleTheme}
							className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-base font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{isDark ? (
								<Sun className="size-5 shrink-0" aria-hidden="true" />
							) : (
								<Moon className="size-5 shrink-0" aria-hidden="true" />
							)}
							{isDark
								? translations.theme.switchToLight
								: translations.theme.switchToDark}
						</button>
					</div>
				</SheetContent>
			</Sheet>
		</nav>
	)
}
