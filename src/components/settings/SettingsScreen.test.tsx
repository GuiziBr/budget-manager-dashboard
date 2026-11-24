// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SettingsScreen } from "./SettingsScreen"

const nav = vi.hoisted(() => ({ search: "", push: vi.fn() }))
vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(nav.search),
	useRouter: () => ({ push: nav.push })
}))

beforeEach(() => {
	nav.search = ""
	nav.push.mockClear()
})

const selected = () =>
	screen
		.getAllByRole("tab")
		.find((t) => t.getAttribute("aria-selected") === "true")

describe("SettingsScreen", () => {
	it("lists the five tabs", () => {
		render(<SettingsScreen />)
		expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
			"Categories",
			"Payment types",
			"Banks",
			"Stores",
			"Appearance"
		])
	})

	it("shows Categories when the address has no tab", () => {
		render(<SettingsScreen />)
		expect(selected()?.textContent).toBe("Categories")
	})

	it("falls back to Categories for an unknown tab", () => {
		nav.search = "tab=garbage"
		render(<SettingsScreen />)
		expect(selected()?.textContent).toBe("Categories")
	})

	it("selects the tab named in the address", () => {
		nav.search = "tab=stores"
		render(<SettingsScreen />)
		expect(selected()?.textContent).toBe("Stores")
	})

	it("pushes the chosen tab into the address", async () => {
		render(<SettingsScreen />)
		await userEvent.click(screen.getByRole("tab", { name: "Banks" }))
		expect(nav.push).toHaveBeenCalledWith("/settings?tab=banks")
	})
})
