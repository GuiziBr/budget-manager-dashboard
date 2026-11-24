import { SETTINGS_PATH } from "@/lib/navigation"

export const SETTINGS_TABS = [
	"categories",
	"payment-types",
	"banks",
	"stores",
	"appearance"
] as const

export type SettingsTab = (typeof SETTINGS_TABS)[number]

export const DEFAULT_SETTINGS_TAB: SettingsTab = "categories"

// A missing or unknown `?tab=` falls back to Categories
export function resolveSettingsTab(
	value: string | null | undefined
): SettingsTab {
	return SETTINGS_TABS.find((tab) => tab === value) ?? DEFAULT_SETTINGS_TAB
}

export const settingsTabHref = (tab: SettingsTab) =>
	`${SETTINGS_PATH}?tab=${tab}`
