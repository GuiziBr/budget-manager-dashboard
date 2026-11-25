// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SettingsSection } from "./SettingsSection"

describe("SettingsSection", () => {
	it("links back to the settings list", () => {
		render(<SettingsSection />)
		expect(
			screen.getByRole("link", { name: "Back to Management" })
		).toHaveAttribute("href", "/management")
	})
})
