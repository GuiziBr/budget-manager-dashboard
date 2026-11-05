// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import { MonthHeader } from "./MonthHeader"

const nav = vi.hoisted(() => ({ search: "", push: vi.fn() }))
vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(nav.search),
	useRouter: () => ({ push: nav.push })
}))

const make = (year: number, month: number) => ({
	id: `${year}-${month}`,
	year,
	month,
	createdAt: "",
	updatedAt: "",
	deletedAt: null
})

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] })
	vi.setSystemTime(new Date("2026-11-02T12:00:00Z"))
	nav.search = ""
	nav.push.mockClear()
	vi.spyOn(api, "get").mockResolvedValue([
		make(2026, 3),
		make(2025, 12),
		make(2026, 11)
	])
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

const setup = () => {
	const { wrapper } = createQueryWrapper()
	render(<MonthHeader />, { wrapper })
	return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

describe("MonthHeader", () => {
	it("shows the month name and steps with the arrows", async () => {
		const user = setup()
		expect(screen.getByText("November 2026")).toBeInTheDocument()
		await user.click(screen.getByRole("button", { name: /December 2026/ }))
		expect(nav.push).toHaveBeenCalledWith("/month?period=2026-12")
		await user.click(screen.getByRole("button", { name: /October 2026/ }))
		expect(nav.push).toHaveBeenCalledWith("/month?period=2026-10")
	})

	it("disables next at December of next year", () => {
		nav.search = "period=2027-12"
		setup()
		expect(screen.getByRole("button", { name: /Next month/ })).toBeDisabled()
	})

	it("lists opened months grouped by year and picks one", async () => {
		const user = setup()
		await waitFor(() => expect(api.get).toHaveBeenCalled())
		await user.click(screen.getByRole("button", { name: "Choose a month" }))
		const items = await screen.findAllByRole("menuitem")
		expect(items.map((i) => i.textContent)).toEqual([
			"November 2026",
			"March 2026",
			"December 2025"
		])
		expect(screen.getByText("2026")).toBeInTheDocument()
		await user.click(screen.getByRole("menuitem", { name: "March 2026" }))
		expect(nav.push).toHaveBeenCalledWith("/month?period=2026-03")
	})
})
