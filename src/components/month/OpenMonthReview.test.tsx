// @vitest-environment jsdom
import {
	cleanup,
	render,
	screen,
	waitFor,
	within
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import type { BudgetEnvelope, Category, Expense, Income } from "@/types"
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

function income(id: string, overrides: Partial<Income> = {}): Income {
	return {
		id,
		budgetPeriodId: "p0",
		description: id,
		amount: 1000,
		isSalary: true,
		receivedAt: null,
		createdAt: "",
		updatedAt: "",
		deletedAt: null,
		...overrides
	}
}

const novemberPeriod = {
	id: "p0",
	year: 2026,
	month: 11,
	createdAt: "",
	updatedAt: "",
	deletedAt: null
}

type Routes = {
	expenses?: () => unknown
	envelopes?: () => unknown
	/** The budget periods; November (last month) by default. */
	periods?: () => unknown
	/** Incomes by period id (`p0` is last month, `p1` the new month). */
	incomes?: (periodId: string) => unknown
}

function mockApi({ expenses, envelopes: env, periods, incomes }: Routes = {}) {
	vi.spyOn(api, "getPage").mockImplementation((async () =>
		(expenses ?? (() => ({ data: month, total: month.length })))()) as never)
	vi.spyOn(api, "get").mockImplementation((async (endpoint: string) => {
		if (endpoint.startsWith("budget-envelopes"))
			return (env ?? (() => envelopes))()
		if (endpoint.startsWith("budget-periods"))
			return (periods ?? (() => [novemberPeriod]))()
		if (endpoint.startsWith("incomes?budgetPeriodId="))
			return (incomes ?? (() => []))(endpoint.split("=")[1] as string)
		return categories
	}) as never)
}

/**
 * Renders the review. The sections start hidden (except Income), so unless `expand` is
 * false the bills, installments and categories are shown first, as a user would.
 */
async function setup({ expand = true } = {}) {
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
	const user = userEvent.setup()
	if (expand) {
		for (const name of [/Recurring bills/, /Installments/, /Categories/]) {
			const toggle = await screen.findByRole("button", { name })
			if (toggle.getAttribute("aria-expanded") === "false")
				await user.click(toggle)
		}
	}
	return { onClose, user }
}

/** Salary fields only exist once "Add salary" is clicked. */
async function addSalary(user: ReturnType<typeof userEvent.setup>) {
	await user.click(await screen.findByRole("button", { name: "Add salary" }))
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
		await setup()

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
		await setup()
		await screen.findByText("Car finance")
		expect(screen.getAllByText("Last payment")).toHaveLength(1)
	})

	it("saves an edited bill amount and closes (M-02)", async () => {
		mockApi()
		const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never)
		const { user, onClose } = await setup()

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
		const { user, onClose } = await setup()
		await screen.findByLabelText("Amount for Hydro")

		await user.click(screen.getByRole("button", { name: "Done" }))

		expect(onClose).toHaveBeenCalled()
		expect(patch).not.toHaveBeenCalled()
	})

	it("closes with Close and Escape without saving", async () => {
		mockApi()
		const patch = vi.spyOn(api, "patch")
		const { user, onClose } = await setup()
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
		const { user } = await setup()
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
		const { user, onClose } = await setup()

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
		const { user } = await setup()

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
		await setup()

		expect(await screen.findByText("No recurring bills")).toBeInTheDocument()
		expect(
			screen.getByText("No installments due this month")
		).toBeInTheDocument()
		expect(await screen.findByText("No categories")).toBeInTheDocument()
	})

	describe("hiding sections", () => {
		it("starts with every section hidden except Income", async () => {
			mockApi()
			await setup({ expand: false })
			await screen.findByRole("button", { name: "Add salary" })

			for (const name of [/Recurring bills/, /Installments/, /Categories/])
				expect(screen.getByRole("button", { name })).toHaveAttribute(
					"aria-expanded",
					"false"
				)
			expect(screen.getByRole("button", { name: /Income/ })).toHaveAttribute(
				"aria-expanded",
				"true"
			)
		})

		it("hides and shows each section", async () => {
			mockApi()
			const { user } = await setup()
			await screen.findByLabelText("Amount for Hydro")

			const toggles = screen.getAllByRole("button", {
				name: /Recurring bills|Installments|Categories|Income/
			})
			expect(toggles).toHaveLength(4)
			for (const toggle of toggles)
				expect(toggle).toHaveAttribute("aria-expanded", "true")

			await user.click(screen.getByRole("button", { name: /Recurring bills/ }))

			expect(
				screen.getByRole("button", { name: /Recurring bills/ })
			).toHaveAttribute("aria-expanded", "false")
			expect(
				screen.queryByRole("textbox", { name: "Amount for Hydro" })
			).toBeNull()
			// The other sections stay open
			expect(screen.getByText("Car finance")).toBeInTheDocument()

			await user.click(screen.getByRole("button", { name: /Recurring bills/ }))
			expect(
				await screen.findByRole("textbox", { name: "Amount for Hydro" })
			).toBeInTheDocument()
		})

		it("doesn't remember the choice: a new review starts from the defaults", async () => {
			mockApi()
			const first = await setup()
			await screen.findByLabelText("Amount for Hydro")
			await first.user.click(screen.getByRole("button", { name: /Income/ }))
			await first.user.click(
				screen.getByRole("button", { name: /Recurring bills/ })
			)
			cleanup()

			await setup({ expand: false })

			expect(screen.getByRole("button", { name: /Income/ })).toHaveAttribute(
				"aria-expanded",
				"true"
			)
			expect(
				screen.getByRole("button", { name: /Recurring bills/ })
			).toHaveAttribute("aria-expanded", "false")
		})
	})

	describe("hiding sections: problems open them", () => {
		it("opens a hidden section when its load fails", async () => {
			mockApi({
				envelopes: () => {
					throw new ApiError("boom", 500)
				}
			})
			await setup({ expand: false })

			expect(
				await screen.findByText("Couldn't load the categories")
			).toBeVisible()
			expect(
				screen.getByRole("button", { name: /Categories/ })
			).toHaveAttribute("aria-expanded", "true")
		})

		it("opens a hidden section when saving its changes fails", async () => {
			mockApi()
			vi.spyOn(api, "patch").mockRejectedValue(new ApiError("boom", 500))
			const { user } = await setup()
			const hydro = await screen.findByLabelText("Amount for Hydro")
			await user.clear(hydro)
			await user.type(hydro, "11240")
			await user.click(screen.getByRole("button", { name: /Recurring bills/ }))
			expect(
				screen.getByRole("button", { name: /Recurring bills/ })
			).toHaveAttribute("aria-expanded", "false")

			await user.click(screen.getByRole("button", { name: "Done" }))

			expect(
				await screen.findByText("Couldn't save 1 of the changes. Try again.")
			).toBeVisible()
			expect(
				screen.getByRole("button", { name: /Recurring bills/ })
			).toHaveAttribute("aria-expanded", "true")
		})

		it("opens the income section when a salary can't be saved", async () => {
			mockApi()
			vi.spyOn(api, "post").mockRejectedValue(new ApiError("boom", 500))
			const { user } = await setup()
			await addSalary(user)
			await user.type(screen.getByLabelText("Amount of salary 1"), "614400")
			await user.click(screen.getByRole("button", { name: /Income/ }))
			await user.click(screen.getByRole("button", { name: "Done" }))

			expect(await screen.findByText(/Couldn't save Salary/)).toBeVisible()
			expect(screen.getByRole("button", { name: /Income/ })).toHaveAttribute(
				"aria-expanded",
				"true"
			)
		})
	})

	describe("salary (M-02)", () => {
		const lastMonthSalaries = (id: string) =>
			id === "p0"
				? [
						income("Job", { amount: 3000 }),
						income("Side gig", { amount: 500.5 }),
						income("Gift", { amount: 50, isSalary: false })
					]
				: []

		const amountOf = (n: number) =>
			screen.getByLabelText(`Amount of salary ${n}`)
		const done = (user: ReturnType<typeof userEvent.setup>) =>
			user.click(screen.getByRole("button", { name: "Done" }))

		it("starts with no rows when last month had no salary", async () => {
			mockApi()
			await setup()

			expect(
				await screen.findByRole("button", { name: "Add salary" })
			).toBeInTheDocument()
			expect(screen.queryByLabelText("Amount of salary 1")).toBeNull()
		})

		it("starts with no rows when last month isn't opened", async () => {
			mockApi({ periods: () => [], incomes: lastMonthSalaries })
			await setup()

			expect(
				await screen.findByRole("button", { name: "Add salary" })
			).toBeInTheDocument()
			expect(screen.queryByLabelText("Amount of salary 1")).toBeNull()
		})

		it("starts with last month's salaries, descriptions and amounts, and no other income", async () => {
			mockApi({ incomes: lastMonthSalaries })
			await setup()

			expect(
				await screen.findByLabelText("Description of salary 1")
			).toHaveValue("Job")
			expect(amountOf(1)).toHaveValue("3,000.00")
			expect(screen.getByLabelText("Description of salary 2")).toHaveValue(
				"Side gig"
			)
			expect(amountOf(2)).toHaveValue("500.50")
			expect(screen.queryByLabelText("Amount of salary 3")).toBeNull()
			expect(screen.queryByDisplayValue("Gift")).toBeNull()
		})

		it("says the salaries were copied while at least one copied row is left", async () => {
			mockApi({ incomes: lastMonthSalaries })
			const { user } = await setup()
			const hint = "Salary incomes were copied from last month"

			expect(await screen.findByText(hint)).toBeInTheDocument()
			await user.click(screen.getByRole("button", { name: "Remove salary 1" }))
			expect(screen.getByText(hint)).toBeInTheDocument()
			await user.click(screen.getByRole("button", { name: "Remove salary 1" }))
			expect(screen.queryByText(hint)).toBeNull()
		})

		it("doesn't say so when nothing was copied, even after adding a salary", async () => {
			mockApi()
			const { user } = await setup()
			await addSalary(user)

			expect(
				screen.queryByText("Salary incomes were copied from last month")
			).toBeNull()
		})

		it("creates last month's salaries untouched when Done is pressed", async () => {
			mockApi({ incomes: lastMonthSalaries })
			const post = vi.spyOn(api, "post").mockResolvedValue({} as never)
			const { user, onClose } = await setup()
			await screen.findByLabelText("Amount of salary 2")

			await done(user)

			await waitFor(() => expect(onClose).toHaveBeenCalled())
			expect(post).toHaveBeenCalledTimes(2)
			expect(post).toHaveBeenCalledWith("incomes", {
				budgetPeriodId: "p1",
				description: "Job",
				amount: 3000,
				isSalary: true
			})
			expect(post).toHaveBeenCalledWith("incomes", {
				budgetPeriodId: "p1",
				description: "Side gig",
				amount: 500.5,
				isSalary: true
			})
		})

		it("keeps what the user decides: an edited amount and a removed salary", async () => {
			mockApi({ incomes: lastMonthSalaries })
			const post = vi.spyOn(api, "post").mockResolvedValue({} as never)
			const { user, onClose } = await setup()

			const job = await screen.findByLabelText("Amount of salary 1")
			await user.clear(job)
			await user.type(job, "310000")
			await user.click(screen.getByRole("button", { name: "Remove salary 2" }))
			expect(screen.queryByLabelText("Amount of salary 2")).toBeNull()
			await done(user)

			await waitFor(() => expect(onClose).toHaveBeenCalled())
			expect(post).toHaveBeenCalledTimes(1)
			expect(post).toHaveBeenCalledWith("incomes", {
				budgetPeriodId: "p1",
				description: "Job",
				amount: 3100,
				isSalary: true
			})
		})

		it("adds a salary after last month's rows", async () => {
			mockApi({ incomes: lastMonthSalaries })
			const post = vi.spyOn(api, "post").mockResolvedValue({} as never)
			const { user, onClose } = await setup()
			await screen.findByLabelText("Amount of salary 2")
			await user.click(screen.getByRole("button", { name: "Remove salary 1" }))
			await user.click(screen.getByRole("button", { name: "Remove salary 1" }))

			await addSalary(user)
			await user.type(amountOf(1), "614400")
			await addSalary(user)
			await user.type(screen.getByLabelText("Description of salary 2"), "Bonus")
			await user.type(amountOf(2), "50050")
			await done(user)

			await waitFor(() => expect(onClose).toHaveBeenCalled())
			expect(post).toHaveBeenCalledTimes(2)
			expect(post).toHaveBeenCalledWith("incomes", {
				budgetPeriodId: "p1",
				description: "Salary",
				amount: 6144,
				isSalary: true
			})
			expect(post).toHaveBeenCalledWith("incomes", {
				budgetPeriodId: "p1",
				description: "Bonus",
				amount: 500.5,
				isSalary: true
			})
			expect(toast.success).toHaveBeenCalledWith("December 2026 is ready")
		})

		it("creates nothing when there are no rows or only an empty one", async () => {
			mockApi()
			const post = vi.spyOn(api, "post")
			const { user, onClose } = await setup()
			await screen.findByRole("button", { name: "Add salary" })
			await done(user)
			expect(onClose).toHaveBeenCalledTimes(1)

			await addSalary(user)
			await done(user)
			expect(onClose).toHaveBeenCalledTimes(2)
			expect(post).not.toHaveBeenCalled()
		})

		it("creates nothing when the review is closed without Done", async () => {
			mockApi({ incomes: lastMonthSalaries })
			const post = vi.spyOn(api, "post")
			const { user, onClose } = await setup()
			await screen.findByLabelText("Amount of salary 1")

			await user.keyboard("{Escape}")

			expect(onClose).toHaveBeenCalled()
			expect(post).not.toHaveBeenCalled()
		})

		it("blocks Done on an invalid amount until it is fixed or removed", async () => {
			mockApi({ incomes: lastMonthSalaries })
			const { user } = await setup()
			const job = await screen.findByLabelText("Amount of salary 1")
			await user.clear(job)
			await user.type(job, "100000000000")

			expect(job).toHaveAttribute("aria-invalid", "true")
			expect(screen.getByRole("button", { name: "Done" })).toBeDisabled()

			await user.click(screen.getByRole("button", { name: "Remove salary 1" }))
			expect(screen.getByRole("button", { name: "Done" })).toBeEnabled()
		})

		it("names a salary that failed and retries without duplicating the saved one", async () => {
			let failSide = true
			mockApi({
				incomes: (id) =>
					id === "p0"
						? lastMonthSalaries(id)
						: // After the first attempt the month already holds Job
							[income("created-job", { description: "Job", amount: 3000 })]
			})
			const post = vi.spyOn(api, "post").mockImplementation((async (
				_: string,
				body: { description: string }
			) => {
				if (body.description === "Side gig" && failSide)
					throw new ApiError("boom", 500)
				return {}
			}) as never)
			const { user, onClose } = await setup()
			await screen.findByLabelText("Amount of salary 2")

			await done(user)

			const alert = await screen.findByText(/Couldn't save Side gig/)
			expect(onClose).not.toHaveBeenCalled()
			expect(amountOf(1)).toBeDisabled()
			post.mockClear()
			failSide = false

			await user.click(
				within(alert.closest("[role=alert]") as HTMLElement).getByRole(
					"button",
					{
						name: "Retry"
					}
				)
			)

			await waitFor(() => expect(onClose).toHaveBeenCalled())
			expect(post).toHaveBeenCalledTimes(1)
			expect(post).toHaveBeenCalledWith(
				"incomes",
				expect.objectContaining({ description: "Side gig", amount: 500.5 })
			)
		})

		it("doesn't resend a salary that the re-read finds in the month", async () => {
			mockApi({
				incomes: (id) =>
					id === "p0"
						? [income("Job", { amount: 3000 })]
						: [income("saved", { description: "Job", amount: 3000 })]
			})
			const post = vi
				.spyOn(api, "post")
				.mockRejectedValueOnce(new ApiError("lost response", 500))
				.mockResolvedValue({} as never)
			const { user, onClose } = await setup()
			await screen.findByLabelText("Amount of salary 1")

			await done(user)
			const alert = await screen.findByText(/Couldn't save Job/)
			await user.click(
				within(alert.closest("[role=alert]") as HTMLElement).getByRole(
					"button",
					{
						name: "Retry"
					}
				)
			)

			await waitFor(() => expect(onClose).toHaveBeenCalled())
			expect(post).toHaveBeenCalledTimes(1)
		})

		it("keeps Add salary available when last month's incomes can't be read", async () => {
			mockApi({
				incomes: () => {
					throw new ApiError("boom", 500)
				}
			})
			await setup()

			expect(
				await screen.findByText("Couldn't load last month's salary")
			).toBeInTheDocument()
			expect(
				screen.getByRole("button", { name: "Add salary" })
			).toBeInTheDocument()
		})

		it("saves bills and the salaries together", async () => {
			mockApi({ incomes: lastMonthSalaries })
			const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never)
			const post = vi.spyOn(api, "post").mockResolvedValue({} as never)
			const { user, onClose } = await setup()

			const hydro = await screen.findByLabelText("Amount for Hydro")
			await user.clear(hydro)
			await user.type(hydro, "11240")
			await screen.findByLabelText("Amount of salary 2")
			await done(user)

			await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
			expect(patch).toHaveBeenCalledTimes(1)
			expect(post).toHaveBeenCalledTimes(2)
			expect(toast.success).toHaveBeenCalledTimes(1)
		})
	})
})
