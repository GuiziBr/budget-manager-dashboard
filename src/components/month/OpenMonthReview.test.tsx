// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import type { BudgetEnvelope, Category, Expense } from "@/types"
import { OpenMonthReview } from "./OpenMonthReview"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast }))

vi.mock("@/hooks/use-media-query", () => ({
	PHONE_QUERY: "phone",
	useMediaQuery: () => false
}))

function expense(id: string, overrides: Partial<Expense> = {}): Expense {
	return {
		id,
		budgetPeriodId: "p1",
		recurringExpenseId: null,
		description: id,
		installmentNumber: null,
		purchasedAt: null,
		dueAt: null,
		paidAt: null,
		amount: 100,
		category: { id: "c1", name: "Utilities" },
		paymentType: { id: "t1", name: "Card" },
		bank: null,
		store: null,
		installment: null,
		monthsRunning: null,
		createdAt: "",
		updatedAt: "",
		deletedAt: null,
		...overrides
	}
}

const plan = (total: number) => ({
	id: "g1",
	totalInstallments: total,
	paymentIntervalDays: 30,
	firstPurchasedAt: "2026-01-01"
})

const month = [
	expense("Hydro", { recurringExpenseId: "r1", amount: 105 }),
	expense("Internet", { recurringExpenseId: "r2", amount: 80 }),
	expense("Car finance", {
		installment: plan(104),
		installmentNumber: 104,
		amount: 450
	}),
	expense("Laptop", { installment: plan(12), installmentNumber: 5, amount: 90 })
]

const categories = [{ id: "c1", name: "Grocery" }] as Category[]
const envelopes = [
	{ id: "e1", categoryId: "c1", allocatedAmount: 300 }
] as BudgetEnvelope[]

type Routes = { expenses?: () => unknown; envelopes?: () => unknown }

function mockApi({ expenses, envelopes: env }: Routes = {}) {
	vi.spyOn(api, "getPage").mockImplementation((async () =>
		(expenses ?? (() => ({ data: month, total: month.length })))()) as never)
	vi.spyOn(api, "get").mockImplementation((async (endpoint: string) => {
		if (endpoint.startsWith("budget-envelopes"))
			return (env ?? (() => envelopes))()
		return categories
	}) as never)
}

function setup() {
	const onClose = vi.fn()
	const { wrapper } = createQueryWrapper()
	render(
		<OpenMonthReview
			periodId="p1"
			month={{ year: 2026, month: 12 }}
			onClose={onClose}
		/>,
		{ wrapper }
	)
	return { onClose, user: userEvent.setup() }
}

beforeEach(() => {
	toast.success.mockClear()
	toast.error.mockClear()
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe("OpenMonthReview", () => {
	it("lists the generated bills, installments and envelopes", async () => {
		mockApi()
		setup()

		expect(
			await screen.findByRole("dialog", { name: "Review" })
		).toHaveTextContent("December 2026")
		expect(await screen.findByLabelText("Amount for Hydro")).toHaveValue(
			"105.00"
		)
		expect(screen.getByLabelText("Amount for Internet")).toHaveValue("80.00")
		expect(screen.getByText("Car finance")).toBeInTheDocument()
		expect(screen.getByText("104/104")).toBeInTheDocument()
		expect(screen.getByText("5/12")).toBeInTheDocument()
		expect(await screen.findByText("Grocery")).toBeInTheDocument()
		expect(screen.getByText("$300.00")).toBeInTheDocument()
	})

	it("tags only the final payment of a plan", async () => {
		mockApi()
		setup()
		await screen.findByText("Car finance")
		expect(screen.getAllByText("Last payment")).toHaveLength(1)
	})

	it("saves an edited bill amount and closes (M-02)", async () => {
		mockApi()
		const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never)
		const { user, onClose } = setup()

		const hydro = await screen.findByLabelText("Amount for Hydro")
		await user.clear(hydro)
		await user.type(hydro, "11240")
		await user.click(screen.getByRole("button", { name: "Done" }))

		await waitFor(() => expect(onClose).toHaveBeenCalled())
		expect(patch).toHaveBeenCalledTimes(1)
		expect(patch).toHaveBeenCalledWith("expenses/Hydro", { amount: 112.4 })
		expect(toast.success).toHaveBeenCalledWith("December 2026 is ready")
	})

	it("closes without a request when nothing changed", async () => {
		mockApi()
		const patch = vi.spyOn(api, "patch")
		const { user, onClose } = setup()
		await screen.findByLabelText("Amount for Hydro")

		await user.click(screen.getByRole("button", { name: "Done" }))

		expect(onClose).toHaveBeenCalled()
		expect(patch).not.toHaveBeenCalled()
	})

	it("closes with Close and Escape without saving", async () => {
		mockApi()
		const patch = vi.spyOn(api, "patch")
		const { user, onClose } = setup()
		const hydro = await screen.findByLabelText("Amount for Hydro")
		await user.type(hydro, "9")

		await user.click(
			screen.getAllByRole("button", { name: "Close" })[1] as HTMLElement
		)
		await user.keyboard("{Escape}")

		expect(onClose).toHaveBeenCalledTimes(2)
		expect(patch).not.toHaveBeenCalled()
	})

	it("blocks Done on an invalid amount", async () => {
		mockApi()
		const { user } = setup()
		const hydro = await screen.findByLabelText("Amount for Hydro")
		await user.clear(hydro)

		expect(hydro).toHaveAttribute("aria-invalid", "true")
		expect(screen.getByRole("button", { name: "Done" })).toBeDisabled()
	})

	it("keeps the review open when a save fails and retries only that bill", async () => {
		mockApi()
		let failInternet = true
		const patch = vi.spyOn(api, "patch").mockImplementation((async (
			endpoint: string
		) => {
			if (endpoint === "expenses/Internet" && failInternet)
				throw new ApiError("boom", 500)
			return {}
		}) as never)
		const { user, onClose } = setup()

		for (const [name, digits] of [
			["Hydro", "11240"],
			["Internet", "9000"]
		] as const) {
			const field = await screen.findByLabelText(`Amount for ${name}`)
			await user.clear(field)
			await user.type(field, digits)
		}
		await user.click(screen.getByRole("button", { name: "Done" }))

		const alert = await screen.findByText(
			"Couldn't save 1 of the changes. Try again."
		)
		expect(onClose).not.toHaveBeenCalled()
		expect(screen.getByLabelText("Amount for Internet")).toHaveAttribute(
			"aria-invalid",
			"true"
		)
		patch.mockClear()
		failInternet = false

		await user.click(
			within(alert.closest("[role=alert]") as HTMLElement).getByRole("button", {
				name: "Retry"
			})
		)

		await waitFor(() => expect(onClose).toHaveBeenCalled())
		expect(patch).toHaveBeenCalledTimes(1)
		expect(patch).toHaveBeenCalledWith("expenses/Internet", { amount: 90 })
	})

	it("shows an error with Retry in the failed section only", async () => {
		mockApi({
			envelopes: () => {
				throw new ApiError("boom", 500)
			}
		})
		const { user } = setup()

		expect(await screen.findByLabelText("Amount for Hydro")).toBeInTheDocument()
		expect(
			await screen.findByText("Couldn't load the categories")
		).toBeInTheDocument()
		expect(screen.queryByText("Couldn't load the recurring bills")).toBeNull()
		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
		await user.click(screen.getByRole("button", { name: "Retry" }))
	})

	it("says so when a month has nothing generated", async () => {
		mockApi({
			expenses: () => ({ data: [], total: 0 }),
			envelopes: () => []
		})
		setup()

		expect(await screen.findByText("No recurring bills")).toBeInTheDocument()
		expect(
			screen.getByText("No installments due this month")
		).toBeInTheDocument()
		expect(await screen.findByText("No categories")).toBeInTheDocument()
	})
})
