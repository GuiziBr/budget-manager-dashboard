// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import { MonthScreen } from "./MonthScreen"

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
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

const setup = () => {
	const { wrapper } = createQueryWrapper()
	render(<MonthScreen />, { wrapper })
	return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

describe("MonthScreen states", () => {
	it("shows a loading status while the periods load", () => {
		vi.spyOn(api, "get").mockReturnValue(new Promise(() => {}))
		setup()
		expect(screen.getByRole("status")).toHaveTextContent("Loading month")
	})

	it("shows the error with a Retry that refetches", async () => {
		const get = vi
			.spyOn(api, "get")
			.mockRejectedValueOnce(new ApiError("boom", 500))
			.mockResolvedValue([make(2026, 11)])
		const user = setup()
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Something went wrong. Try again."
		)
		await user.click(screen.getByRole("button", { name: "Retry" }))
		await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2))
		await vi.waitFor(() =>
			expect(screen.queryByRole("alert")).not.toBeInTheDocument()
		)
	})

	it("offers to open a current month that isn't opened", async () => {
		vi.spyOn(api, "get").mockResolvedValue([])
		setup()
		expect(
			await screen.findByText("November 2026 hasn't been opened yet")
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Open November 2026" })
		).toBeDisabled()
	})

	it("offers to open a future month that isn't opened", async () => {
		nav.search = "period=2027-03"
		vi.spyOn(api, "get").mockResolvedValue([])
		setup()
		expect(
			await screen.findByText("March 2027 hasn't been opened yet")
		).toBeInTheDocument()
	})

	it("says a past month was not tracked, without an Open button", async () => {
		nav.search = "period=2025-01"
		vi.spyOn(api, "get").mockResolvedValue([])
		setup()
		expect(
			await screen.findByText("January 2025 wasn't tracked in the app")
		).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: /^Open / })).toBeNull()
	})

	it("shows the closed banner for an opened past month", async () => {
		nav.search = "period=2026-10"
		vi.spyOn(api, "get").mockResolvedValue([make(2026, 10)])
		setup()
		expect(
			await screen.findByText(
				"October 2026 is closed. You can view it but not change it."
			)
		).toBeInTheDocument()
	})

	it("shows no state message for an opened current month", async () => {
		vi.spyOn(api, "get").mockResolvedValue([make(2026, 11)])
		setup()
		await vi.waitFor(() =>
			expect(screen.queryByRole("status")).not.toBeInTheDocument()
		)
		expect(screen.queryByText(/hasn't been opened/)).toBeNull()
		expect(screen.queryByText(/is closed/)).toBeNull()
	})
})
