import { CalendarDays, type LucideIcon, Repeat, Settings } from "lucide-react"
import { translations } from "@/constants/translations"
import { formatMonth, type Month } from "@/lib/month"

export interface NavItem {
	label: string
	href: string
	icon: LucideIcon
}

export interface NavGroup {
	id: "overview"
	label: string
	items: NavItem[]
}

export const MONTH_PATH = "/month"
export const RECURRING_PATH = "/recurring"
export const SETTINGS_PATH = "/settings"

export const DEFAULT_PATH = MONTH_PATH

export function monthHref(month: Month): string {
	return `${MONTH_PATH}?period=${formatMonth(month)}`
}

export const NAV_GROUPS: NavGroup[] = [
	{
		id: "overview",
		label: translations.navigation.overview,
		items: [
			{
				label: translations.navigation.items.month,
				href: MONTH_PATH,
				icon: CalendarDays
			},
			{
				label: translations.navigation.items.recurring,
				href: RECURRING_PATH,
				icon: Repeat
			},
			{
				label: translations.navigation.items.settings,
				href: SETTINGS_PATH,
				icon: Settings
			}
		]
	}
]

export const MAIN_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(
	(group) => group.items
)

/** Items shown as tabs in the mobile bar. The rest go into the More sheet. */
export const MOBILE_TAB_ITEMS: NavItem[] = MAIN_NAV_ITEMS.slice(0, 3)

export const MORE_NAV_ITEMS: NavItem[] = MAIN_NAV_ITEMS.filter(
	(item) => !MOBILE_TAB_ITEMS.some((tab) => tab.href === item.href)
)

export const isNavItemActive = (pathname: string | null, href: string) =>
	pathname === href

export const isMoreTabActive = (pathname: string | null) =>
	MORE_NAV_ITEMS.some((item) => isNavItemActive(pathname, item.href))

export const getPageTitle = (pathname: string | null) =>
	MAIN_NAV_ITEMS.find((item) => item.href === pathname)?.label ??
	translations.navigation.items.month
