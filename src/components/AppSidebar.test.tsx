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

	it("links to Month and Recurring, and Management is a toggle, not a link", () => {
		setup()

		expect(screen.getByRole("link", { name: "Month" })).toHaveAttribute(
			"href",
			"/month"
		)
		expect(screen.getByRole("link", { name: "Recurring" })).toHaveAttribute(
			"href",
			"/recurring"
		)
		expect(
			screen.queryByRole("link", { name: "Management" })
		).not.toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Management" })).toBeVisible()
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

	it("collapses the submenu outside Management", () => {
		setup()

		expect(
			screen.queryByRole("link", { name: "Banks" })
		).not.toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Management" })).toHaveAttribute(
			"aria-expanded",
			"false"
		)
	})

	it("shows or hides the submenu with the Management button", async () => {
		const user = userEvent.setup()
		setup()
		const toggle = screen.getByRole("button", { name: "Management" })

		await user.click(toggle)
		expect(toggle).toHaveAttribute("aria-expanded", "true")
		expect(screen.getByRole("link", { name: "Banks" })).toBeVisible()

		await user.click(toggle)
		expect(toggle).toHaveAttribute("aria-expanded", "false")
		expect(
			screen.queryByRole("link", { name: "Banks" })
		).not.toBeInTheDocument()
	})

	it("shows the submenu on a Management page and marks the section", () => {
		pathname.current = "/management/banks"
		setup()

		expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual(
			expect.arrayContaining(["Categories", "Payment types", "Banks", "Stores"])
		)
		expect(screen.getByRole("link", { name: "Banks" })).toHaveAttribute(
			"aria-current",
			"page"
		)
		expect(screen.getByRole("link", { name: "Stores" })).not.toHaveAttribute(
			"aria-current"
		)
		expect(screen.queryByText("Appearance")).not.toBeInTheDocument()
	})

	it("opens the submenu when navigating into Management", () => {
		const view = setup()
		pathname.current = "/management/banks"
		view.rerender(
			<ThemeProvider>
				<AppSidebar />
			</ThemeProvider>
		)

		expect(screen.getByRole("link", { name: "Banks" })).toBeVisible()
	})

	it("reopens the submenu when moving between sections after collapsing it", async () => {
		const user = userEvent.setup()
		pathname.current = "/management/categories"
		const view = setup()

		await user.click(screen.getByRole("button", { name: "Management" }))
		expect(
			screen.queryByRole("link", { name: "Banks" })
		).not.toBeInTheDocument()

		pathname.current = "/management/banks"
		view.rerender(
			<ThemeProvider>
				<AppSidebar />
			</ThemeProvider>
		)
		expect(screen.getByRole("link", { name: "Banks" })).toBeVisible()
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
