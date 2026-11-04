import { describe, expect, it } from "vitest"
import {
	DEFAULT_PATH,
	getPageTitle,
	isMoreTabActive,
	isNavItemActive,
	MAIN_NAV_ITEMS,
	MOBILE_TAB_ITEMS,
	MONTH_PATH,
	RECURRING_PATH,
	SETTINGS_PATH
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
		expect(getPageTitle("/dashboard")).toBe("Month")
	})

	it("shows every item as a tab, so no More item is active", () => {
		expect(MOBILE_TAB_ITEMS).toHaveLength(3)
		for (const item of MAIN_NAV_ITEMS) {
			expect(isMoreTabActive(item.href)).toBe(false)
		}
	})
})
