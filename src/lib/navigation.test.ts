import { describe, expect, it } from "vitest"
import {
	DEFAULT_PATH,
	getPageTitle,
	isMoreTabActive,
	isNavItemActive,
	MOBILE_TAB_ITEMS
} from "./navigation"

describe("navigation", () => {
	it("marks only the exact path as active", () => {
		expect(isNavItemActive(DEFAULT_PATH, DEFAULT_PATH)).toBe(true)
		expect(isNavItemActive("/other", DEFAULT_PATH)).toBe(false)
		expect(isNavItemActive(null, DEFAULT_PATH)).toBe(false)
	})

	it("resolves the page title and falls back to the dashboard title", () => {
		expect(getPageTitle(DEFAULT_PATH)).toBe("Dashboard")
		expect(getPageTitle("/unknown")).toBe("Dashboard")
	})

	it("has no More items active while every item is a tab", () => {
		expect(MOBILE_TAB_ITEMS.length).toBeGreaterThan(0)
		expect(isMoreTabActive(DEFAULT_PATH)).toBe(false)
	})
})
