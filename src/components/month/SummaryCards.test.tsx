// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import { SummaryCards } from "./SummaryCards"

afterEach(() => vi.restoreAllMocks())

const income = (amount: number) => ({ amount, isSalary: false })
const envelope = (spentAmount: number | null) => ({
	allocatedAmount: 500,
	spentAmount
})

function mockApi({
	expenseTotal = 6013.62,
	incomes = [income(7375.67)],
	envelopes = [envelope(300.5), envelope(216.36)]
}: {
	expenseTotal?: number
	incomes?: unknown[]
	envelopes?: unknown[]
} = {}) {
	vi.spyOn(api, "getPage").mockResolvedValue({
		data: [],
		total: 0,
		totalAmount: expenseTotal,
		page: 1,
		limit: 20
	} as never)
	return vi
		.spyOn(api, "get")
		.mockImplementation(((endpoint: string) =>
			Promise.resolve(
				endpoint.includes("incomes") ? incomes : envelopes
			)) as never)
}

const setup = (onViewIncome?: () => void) => {
	const { wrapper } = createQueryWrapper()
	render(<SummaryCards periodId="p1" onViewIncome={onViewIncome} />, {
		wrapper
	})
}

describe("SummaryCards", () => {
	it("shows a loading status first", () => {
		vi.spyOn(api, "getPage").mockReturnValue(new Promise(() => {}))
		vi.spyOn(api, "get").mockReturnValue(new Promise(() => {}))
		setup()
		expect(screen.getByRole("status")).toHaveTextContent("Loading summary")
	})

	it("shows income, expenses (with envelope spend) and balance", async () => {
		mockApi()
		setup()
		expect(await screen.findByText("$7,375.67")).toBeInTheDocument()
		expect(screen.getByText("$6,530.48")).toBeInTheDocument()
		expect(screen.getByText("$845.19")).toBeInTheDocument()
		expect(screen.queryByText(/not included yet/)).toBeNull()
	})

	it("shows a minus on a negative balance", async () => {
		mockApi({
			expenseTotal: 1120,
			incomes: [income(1000)],
			envelopes: []
		})
		setup()
		const value = await screen.findByText("$120.00")
		expect(value.parentElement).toHaveTextContent("-$120.00")
	})

	it("counts missing envelope spend as zero, with no note", async () => {
		mockApi({ envelopes: [envelope(null), envelope(216.36)] })
		setup()
		expect(await screen.findByText("$6,229.98")).toBeInTheDocument()
		expect(screen.queryByText(/not included yet/)).toBeNull()
	})

	it("calls onViewIncome from View all", async () => {
		mockApi()
		const onViewIncome = vi.fn()
		setup(onViewIncome)
		await userEvent.click(
			await screen.findByRole("button", { name: "View all" })
		)
		expect(onViewIncome).toHaveBeenCalledOnce()
	})

	it("shows an error and retries the failed request", async () => {
		const get = mockApi()
		get.mockRejectedValueOnce(new ApiError("boom", 500))
		setup()
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Couldn't load the month summary"
		)
		await userEvent.click(screen.getByRole("button", { name: "Retry" }))
		expect(await screen.findByText("$845.19")).toBeInTheDocument()
	})
})

describe("SummaryCards on a phone", () => {
	it("shows one Balance card holding Income and Expenses", async () => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: true,
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {}
		}))
		mockApi()
		const onViewIncome = vi.fn()
		setup(onViewIncome)
		expect(await screen.findByText("$845.19")).toBeInTheDocument()
		expect(screen.getByText("$7,375.67")).toBeInTheDocument()
		expect(screen.getByText("$6,530.48")).toBeInTheDocument()
		await userEvent.click(screen.getByRole("button", { name: /Income/ }))
		expect(onViewIncome).toHaveBeenCalledOnce()
		vi.unstubAllGlobals()
	})
})
