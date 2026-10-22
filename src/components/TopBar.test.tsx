// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TopBar } from "./TopBar"

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }))

describe("TopBar", () => {
	it("shows the page title as the main heading", () => {
		render(<TopBar />)

		expect(
			screen.getByRole("heading", { level: 1, name: "Dashboard" })
		).toBeVisible()
	})
})
