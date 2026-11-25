import {
	CalendarDays,
	CreditCard,
	Landmark,
	type LucideIcon,
	Repeat,
	Settings2,
	Store,
	Tags
} from "lucide-react"
import { translations } from "@/constants/translations"
import { formatMonth, type Month } from "@/lib/month"

export interface NavItem {
	label: string
	href: string
	icon: LucideIcon
	/** Submenu shown under the item in the sidebar. */
	children?: SubNavItem[]
}

export interface SubNavItem {
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
export const SETTINGS_PATH = "/management"

export const SETTINGS_SECTION_IDS = [
	"categories",
	"payment-types",
	"banks",
	"stores"
] as const

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number]

export const settingsSectionHref = (id: SettingsSectionId) =>
	`${SETTINGS_PATH}/${id}`

const SETTINGS_SECTION_ICONS: Record<SettingsSectionId, LucideIcon> = {
	categories: Tags,
	"payment-types": CreditCard,
	banks: Landmark,
	stores: Store
}

export const SETTINGS_SECTIONS: (SubNavItem & { id: SettingsSectionId })[] =
	SETTINGS_SECTION_IDS.map((id) => ({
		id,
		label: translations.navigation.settingsSections[id],
		href: settingsSectionHref(id),
		icon: SETTINGS_SECTION_ICONS[id]
	}))

export const findSettingsSection = (id: string) =>
	SETTINGS_SECTIONS.find((section) => section.id === id)

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
				icon: Settings2,
				children: SETTINGS_SECTIONS
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

/** True on the item's page and on any page below it (a settings section). */
export const isNavItemWithinActive = (pathname: string | null, href: string) =>
	pathname === href || !!pathname?.startsWith(`${href}/`)

export const isMoreTabActive = (pathname: string | null) =>
	MORE_NAV_ITEMS.some((item) => isNavItemActive(pathname, item.href))

export const getPageTitle = (pathname: string | null) =>
	MAIN_NAV_ITEMS.flatMap((item) => item.children ?? []).find(
		(child) => child.href === pathname
	)?.label ??
	MAIN_NAV_ITEMS.find((item) => item.href === pathname)?.label ??
	translations.navigation.items.month
