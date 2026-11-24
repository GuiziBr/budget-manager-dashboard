import { describe, expect, it } from "vitest"
import {
	resolveSettingsTab,
	SETTINGS_TABS,
	settingsTabHref
} from "./settings-tabs"

describe("resolveSettingsTab", () => {
	it.each(SETTINGS_TABS)("accepts %s", (tab) => {
		expect(resolveSettingsTab(tab)).toBe(tab)
	})

	it("falls back to categories when missing", () => {
		expect(resolveSettingsTab(null)).toBe("categories")
		expect(resolveSettingsTab(undefined)).toBe("categories")
		expect(resolveSettingsTab("")).toBe("categories")
	})

	it("falls back to categories for an unknown value", () => {
		expect(resolveSettingsTab("garbage")).toBe("categories")
		expect(resolveSettingsTab("Banks")).toBe("categories")
	})
})

describe("settingsTabHref", () => {
	it("writes the tab into the address", () => {
		expect(settingsTabHref("banks")).toBe("/settings?tab=banks")
		expect(settingsTabHref("payment-types")).toBe("/settings?tab=payment-types")
	})
})
