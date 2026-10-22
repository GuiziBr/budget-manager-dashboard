// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ThemeProvider } from "@/providers/theme-provider"
import { BottomTabBar } from "./BottomTabBar"

const pathname = vi.hoisted(() => ({ current: "/dashboard" }))
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }))

const setup = () =>
	render(
		<ThemeProvider>
			<BottomTabBar />
		</ThemeProvider>
	)

beforeEach(() => {
	pathname.current = "/dashboard"
	window.localStorage.clear()
	document.documentElement.className = "dark"
})

describe("BottomTabBar", () => {
	it("shows a tab per main item and the More tab", () => {
		setup()

		expect(screen.getByRole("navigation", { name: "Primary" })).toBeVisible()
		expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
			"aria-current",
			"page"
		)
		expect(screen.getByRole("button", { name: "More" })).toBeVisible()
	})

	it("does not mark a tab as current on another page", () => {
		pathname.current = "/elsewhere"
		setup()

		expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
			"aria-current"
		)
	})

	it("opens the More sheet and switches the theme without closing it", async () => {
		const user = userEvent.setup()
		setup()

		await user.click(screen.getByRole("button", { name: "More" }))
		await user.click(
			screen.getByRole("button", { name: "Switch to light theme" })
		)

		expect(screen.getByRole("dialog", { name: "More" })).toBeVisible()
		expect(
			screen.getByRole("button", { name: "Switch to dark theme" })
		).toBeVisible()
	})
})
