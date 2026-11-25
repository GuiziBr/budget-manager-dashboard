"use client"

import { ChevronDown, Moon, Sun, Wallet } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useState } from "react"
import { translations } from "@/constants/translations"
import {
	isNavItemActive,
	isNavItemWithinActive,
	NAV_GROUPS,
	type NavItem
} from "@/lib/navigation"
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

function SidebarItem({
	item,
	pathname
}: {
	item: NavItem
	pathname: string | null
}) {
	const Icon = item.icon
	const submenuId = useId()
	const isActive = isNavItemActive(pathname, item.href)
	const isWithin = isNavItemWithinActive(pathname, item.href)
	const [isExpanded, setIsExpanded] = useState(isWithin)

	// Every move to a page of the section opens its submenu, also between two
	// sections (Back after collapsing it); a collapse by hand lasts until then
	useEffect(() => {
		if (isNavItemWithinActive(pathname, item.href)) setIsExpanded(true)
	}, [pathname, item.href])

	if (!item.children) {
		return (
			<li>
				<Link
					href={item.href}
					aria-current={isActive ? "page" : undefined}
					className={itemClass(isActive)}
				>
					<Icon className="size-[18px] shrink-0" aria-hidden="true" />
					{item.label}
				</Link>
			</li>
		)
	}

	return (
		<li>
			{/* A menu with a submenu only shows or hides it; it goes nowhere itself */}
			<button
				type="button"
				aria-expanded={isExpanded}
				aria-controls={submenuId}
				onClick={() => setIsExpanded((open) => !open)}
				className={cn(
					itemClass(false),
					"cursor-pointer justify-between",
					isWithin && "text-sidebar-foreground"
				)}
			>
				<span className="flex items-center gap-3">
					<Icon className="size-[18px] shrink-0" aria-hidden="true" />
					{item.label}
				</span>
				<ChevronDown
					aria-hidden="true"
					className={cn(
						"size-4 transition-transform duration-200 motion-reduce:transition-none",
						isExpanded && "rotate-180"
					)}
				/>
			</button>
			{item.children && (
				<>
					{/* Grid rows animate the height; hidden links leave the tab order */}
					<div
						id={submenuId}
						aria-hidden={!isExpanded}
						inert={!isExpanded}
						className={cn(
							"grid transition-[grid-template-rows,visibility] duration-200 ease-out motion-reduce:transition-none",
							isExpanded ? "grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
						)}
					>
						<ul
							aria-label={translations.settings.sectionsLabel}
							className="ml-[21px] min-h-0 space-y-1 overflow-hidden border-l border-sidebar-border pl-3"
						>
							{item.children.map((child) => {
								const isChildActive = isNavItemActive(pathname, child.href)
								const ChildIcon = child.icon
								return (
									<li key={child.href} className="first:mt-1">
										<Link
											href={child.href}
											aria-current={isChildActive ? "page" : undefined}
											className={cn(itemClass(isChildActive), "h-9")}
										>
											<ChildIcon
												className="size-4 shrink-0"
												aria-hidden="true"
											/>
											{child.label}
										</Link>
									</li>
								)
							})}
						</ul>
					</div>
				</>
			)}
		</li>
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
								{group.items.map((item) => (
									<SidebarItem
										key={item.href}
										item={item}
										pathname={pathname}
									/>
								))}
							</ul>
						</div>
					)
				})}
			</nav>

			<ThemeToggle />
		</aside>
	)
}
