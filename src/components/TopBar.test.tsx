// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TopBar } from "./TopBar"

const pathname = vi.hoisted(() => ({ current: "/recurring" }))
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }))

beforeEach(() => {
	pathname.current = "/recurring"
})

describe("TopBar", () => {
	it("shows the page title as the main heading", () => {
		render(<TopBar />)

		expect(
			screen.getByRole("heading", { level: 1, name: "Recurring" })
		).toBeVisible()
	})

	it("shows no title on the Month screen", () => {
		pathname.current = "/month"
		render(<TopBar />)

		expect(screen.queryByRole("heading")).not.toBeInTheDocument()
	})
})
