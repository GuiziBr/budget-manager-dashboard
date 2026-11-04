// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ThemeProvider } from "@/providers/theme-provider"
import { AppSidebar } from "./AppSidebar"

const pathname = vi.hoisted(() => ({ current: "/month" }))
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }))

const setup = () =>
	render(
		<ThemeProvider>
			<AppSidebar />
		</ThemeProvider>
	)

beforeEach(() => {
	pathname.current = "/month"
	window.localStorage.clear()
	document.documentElement.className = "dark"
})

describe("AppSidebar", () => {
	it("shows the app name and the navigation", () => {
		setup()

		expect(screen.getByText("Budget Manager")).toBeInTheDocument()
		expect(screen.getByRole("navigation", { name: "Main" })).toBeVisible()
	})

	it("links to Month, Recurring and Settings", () => {
		setup()

		expect(screen.getByRole("link", { name: "Month" })).toHaveAttribute(
			"href",
			"/month"
		)
		expect(screen.getByRole("link", { name: "Recurring" })).toHaveAttribute(
			"href",
			"/recurring"
		)
		expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
			"href",
			"/settings"
		)
	})

	it("marks the current page", () => {
		setup()

		expect(screen.getByRole("link", { name: "Month" })).toHaveAttribute(
			"aria-current",
			"page"
		)
	})

	it("does not mark other pages as current", () => {
		pathname.current = "/elsewhere"
		setup()

		expect(screen.getByRole("link", { name: "Month" })).not.toHaveAttribute(
			"aria-current"
		)
	})

	it("switches the theme", async () => {
		const user = userEvent.setup()
		setup()

		await user.click(
			screen.getByRole("button", { name: "Switch to light theme" })
		)

		expect(
			screen.getByRole("button", { name: "Switch to dark theme" })
		).toBeVisible()
	})
})
