// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import { MonthScreen } from "./MonthScreen"

const nav = vi.hoisted(() => ({
	search: "",
	push: vi.fn(),
	replace: vi.fn()
}))
vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(nav.search),
	useRouter: () => ({ push: nav.push, replace: nav.replace })
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
		vi.spyOn(api, "getPage").mockReturnValue(new Promise(() => {}))
		const user = setup()
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Something went wrong. Try again."
		)
		await user.click(screen.getByRole("button", { name: "Retry" }))
		await vi.waitFor(() =>
			expect(
				get.mock.calls.filter(([endpoint]) =>
					String(endpoint).includes("budget-periods")
				)
			).toHaveLength(2)
		)
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

	it("offers a Closed pill that explains the closed month", async () => {
		nav.search = "period=2026-10"
		vi.spyOn(api, "get").mockResolvedValue([make(2026, 10)])
		const user = setup()
		await user.click(await screen.findByRole("button", { name: "Closed" }))
		expect(
			await screen.findAllByText(
				"October 2026 is closed. You can view it but not change it."
			)
		).toHaveLength(2)
	})

	it("shows the summary cards for an opened month, also a closed one", async () => {
		vi.spyOn(api, "getPage").mockResolvedValue({
			data: [],
			total: 0,
			totalAmount: 0,
			page: 1,
			limit: 10
		} as never)
		vi.spyOn(api, "get").mockImplementation(((endpoint: string) =>
			Promise.resolve(
				endpoint.includes("budget-periods")
					? [make(2026, 11), make(2026, 10)]
					: []
			)) as never)
		nav.search = "period=2026-10"
		setup()
		expect(
			await screen.findByRole("region", { name: "Month summary" })
		).toBeInTheDocument()
	})

	it("shows no summary cards for a month that isn't opened", async () => {
		vi.spyOn(api, "get").mockResolvedValue([])
		setup()
		await screen.findByText(/hasn't been opened/)
		expect(screen.queryByRole("region", { name: "Month summary" })).toBeNull()
	})

	it("shows no state message for an opened current month", async () => {
		vi.spyOn(api, "getPage").mockResolvedValue({
			data: [],
			total: 0,
			totalAmount: 0,
			page: 1,
			limit: 10
		} as never)
		vi.spyOn(api, "get").mockImplementation(((endpoint: string) =>
			Promise.resolve(
				endpoint.includes("budget-periods") ? [make(2026, 11)] : []
			)) as never)
		setup()
		await vi.waitFor(() =>
			expect(screen.queryByRole("status")).not.toBeInTheDocument()
		)
		expect(screen.queryByText(/hasn't been opened/)).toBeNull()
		expect(screen.queryByText(/is closed/)).toBeNull()
	})
})

describe("MonthScreen add button", () => {
	const openMonth = (search: string) => {
		nav.search = search
		vi.spyOn(api, "getPage").mockResolvedValue({
			data: [],
			total: 0,
			totalAmount: 0,
			page: 1,
			limit: 10
		} as never)
		vi.spyOn(api, "get").mockImplementation(((endpoint: string) =>
			Promise.resolve(
				endpoint.includes("budget-periods")
					? [make(2026, 11), make(2026, 10)]
					: []
			)) as never)
	}
	const stubPhone = (matches: boolean) =>
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches,
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {}
		}))
	afterEach(() => vi.unstubAllGlobals())

	it("shows on the phone in an editable month", async () => {
		stubPhone(true)
		openMonth("")
		setup()
		expect(await screen.findByRole("button", { name: "Add" })).toBeVisible()
	})

	it("is hidden on desktop", async () => {
		stubPhone(false)
		openMonth("")
		setup()
		await screen.findByRole("region", { name: "Month summary" })
		expect(screen.queryByRole("button", { name: "Add" })).toBeNull()
	})

	it("is hidden in a closed month", async () => {
		stubPhone(true)
		openMonth("period=2026-10")
		setup()
		await screen.findByRole("region", { name: "Month summary" })
		expect(screen.queryByRole("button", { name: "Add" })).toBeNull()
	})
})

describe("MonthScreen income panel", () => {
	const open = (search = "") => {
		nav.search = search
		vi.spyOn(api, "getPage").mockResolvedValue({
			data: [],
			total: 0,
			totalAmount: 0,
			page: 1,
			limit: 10
		} as never)
		vi.spyOn(api, "get").mockImplementation(((endpoint: string) =>
			Promise.resolve(
				endpoint.includes("budget-periods")
					? [make(2026, 11), make(2026, 10)]
					: endpoint.startsWith("incomes")
						? [
								{
									id: "i1",
									budgetPeriodId: "x",
									description: "Pay day",
									amount: 10,
									isSalary: true,
									receivedAt: null,
									createdAt: "",
									updatedAt: "",
									deletedAt: null
								}
							]
						: []
			)) as never)
	}

	it("lists no income on the page until View all is clicked", async () => {
		open()
		const user = setup()
		await screen.findByRole("region", { name: "Month summary" })
		expect(screen.queryByText("Pay day")).toBeNull()
		await user.click(screen.getByRole("button", { name: /View all/ }))
		expect(await screen.findByText("Pay day")).toBeInTheDocument()
		expect(screen.getByRole("dialog")).toBeInTheDocument()
	})

	it("returns the focus to the control that opened the panel", async () => {
		open()
		const user = setup()
		const viewAll = await screen.findByRole("button", { name: /View all/ })
		await user.click(viewAll)
		await screen.findByText("Pay day")
		await user.keyboard("{Escape}")
		await vi.waitFor(() => expect(viewAll).toHaveFocus())
	})

	it("has no edit controls in a closed month", async () => {
		open("period=2026-10")
		const user = setup()
		await user.click(await screen.findByRole("button", { name: /View all/ }))
		await screen.findByText("Pay day")
		expect(screen.queryByRole("button", { name: "Add income" })).toBeNull()
	})
})
