// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SettingsIndex } from "./SettingsIndex"

describe("SettingsIndex", () => {
	it("links to the four sections in order", () => {
		render(<SettingsIndex />)
		const links = screen.getAllByRole("link")
		expect(links.map((l) => l.textContent)).toEqual([
			"Categories",
			"Payment types",
			"Banks",
			"Stores"
		])
		expect(links.map((l) => l.getAttribute("href"))).toEqual([
			"/management/categories",
			"/management/payment-types",
			"/management/banks",
			"/management/stores"
		])
	})

	it("has no Appearance entry", () => {
		render(<SettingsIndex />)
		expect(screen.queryByText("Appearance")).not.toBeInTheDocument()
	})
})
