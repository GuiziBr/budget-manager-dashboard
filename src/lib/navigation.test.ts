import { describe, expect, it } from "vitest"
import {
	DEFAULT_PATH,
	findSettingsSection,
	getPageTitle,
	isMoreTabActive,
	isNavItemActive,
	isNavItemWithinActive,
	MAIN_NAV_ITEMS,
	MOBILE_TAB_ITEMS,
	MONTH_PATH,
	monthHref,
	navItemLandingHref,
	RECURRING_PATH,
	SETTINGS_PATH,
	SETTINGS_SECTIONS
} from "./navigation"

describe("navigation", () => {
	it("opens on the Month screen", () => {
		expect(DEFAULT_PATH).toBe("/month")
	})

	it("lists Month, Recurring and Settings in order", () => {
		expect(MAIN_NAV_ITEMS.map((item) => item.href)).toEqual([
			MONTH_PATH,
			RECURRING_PATH,
			SETTINGS_PATH
		])
		expect(MAIN_NAV_ITEMS.map((item) => item.label)).toEqual([
			"Month",
			"Recurring",
			"Settings"
		])
	})

	it("marks only the exact path as active", () => {
		expect(isNavItemActive(MONTH_PATH, MONTH_PATH)).toBe(true)
		expect(isNavItemActive(RECURRING_PATH, MONTH_PATH)).toBe(false)
		expect(isNavItemActive(null, MONTH_PATH)).toBe(false)
	})

	it("resolves the page title and falls back to the Month title", () => {
		expect(getPageTitle(MONTH_PATH)).toBe("Month")
		expect(getPageTitle(RECURRING_PATH)).toBe("Recurring")
		expect(getPageTitle(SETTINGS_PATH)).toBe("Settings")
		expect(getPageTitle("/unknown")).toBe("Month")
	})

	it("titles a settings section page with the section name", () => {
		expect(getPageTitle("/settings/banks")).toBe("Banks")
		expect(getPageTitle("/settings/payment-types")).toBe("Payment types")
	})

	it("lists the four settings sections under Settings, without Appearance", () => {
		expect(SETTINGS_SECTIONS.map((s) => s.label)).toEqual([
			"Categories",
			"Payment types",
			"Banks",
			"Stores"
		])
		expect(MAIN_NAV_ITEMS[2].children).toBe(SETTINGS_SECTIONS)
	})

	it("finds a section by id and rejects an unknown one", () => {
		expect(findSettingsSection("banks")?.href).toBe("/settings/banks")
		expect(findSettingsSection("appearance")).toBeUndefined()
	})

	it("is active on the page and below it", () => {
		expect(isNavItemWithinActive("/settings", SETTINGS_PATH)).toBe(true)
		expect(isNavItemWithinActive("/settings/banks", SETTINGS_PATH)).toBe(true)
		expect(isNavItemWithinActive("/settings-x", SETTINGS_PATH)).toBe(false)
		expect(isNavItemWithinActive(null, SETTINGS_PATH)).toBe(false)
	})

	it("lands on the first submenu entry, or on the item itself", () => {
		expect(navItemLandingHref(MAIN_NAV_ITEMS[2])).toBe("/settings/categories")
		expect(navItemLandingHref(MAIN_NAV_ITEMS[0])).toBe(MONTH_PATH)
	})

	it("shows every item as a tab, so no More item is active", () => {
		expect(MOBILE_TAB_ITEMS).toHaveLength(3)
		for (const item of MAIN_NAV_ITEMS) {
			expect(isMoreTabActive(item.href)).toBe(false)
		}
	})
})

describe("monthHref", () => {
	it("builds the month address with a padded month", () => {
		expect(monthHref({ year: 2026, month: 3 })).toBe("/month?period=2026-03")
	})
})
