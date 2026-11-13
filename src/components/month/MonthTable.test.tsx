// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import type { MonthRow } from "@/lib/month-rows"
import { createQueryWrapper } from "@/test/query-wrapper"
import type { Expense, ExpensePage } from "@/types"
import { MonthTable } from "./MonthTable"

const nav = vi.hoisted(() => ({
	search: "period=2026-11",
	push: vi.fn(),
	replace: vi.fn()
}))
vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(nav.search),
	useRouter: () => ({ push: nav.push, replace: nav.replace })
}))

const expense = (id: number, patch: Partial<Expense> = {}): Expense => ({
	id: String(id),
	budgetPeriodId: "p1",
	recurringExpenseId: null,
	description: `Expense ${id}`,
	installmentNumber: null,
	purchasedAt: null,
	dueAt: "2026-11-28",
	paidAt: null,
	amount: 100,
	category: { id: "c1", name: "Housing" },
	paymentType: { id: "t1", name: "Credit Card" },
	bank: null,
	store: null,
	installment: null,
	monthsRunning: null,
	createdAt: "",
	updatedAt: "",
	deletedAt: null,
	...patch
})

const all = Array.from({ length: 45 }, (_, index) => expense(index + 1))

function mockPages(list: Expense[]) {
	return vi
		.spyOn(api, "getPage")
		.mockImplementation(async (_endpoint, params) => {
			const page = Number(params?.page ?? 1)
			const limit = Number(params?.limit ?? 20)
			return {
				data: list.slice((page - 1) * limit, page * limit),
				total: list.length,
				totalAmount: 0,
				page,
				limit
			} as ExpensePage
		})
}

function setup(
	props: {
		canEdit?: boolean
		onAddExpense?: () => void
		selectedId?: string | null
		onSelectRow?: (row: MonthRow) => void
		onEdit?: (expense: Expense) => void
	} = {}
) {
	const { wrapper } = createQueryWrapper()
	render(
		<MonthTable periodId="p1" canEdit={props.canEdit ?? true} {...props} />,
		{
			wrapper
		}
	)
	return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] })
	vi.setSystemTime(new Date("2026-11-15T12:00:00Z"))
	nav.search = "period=2026-11"
	nav.push.mockClear()
	nav.replace.mockClear()
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
	window.localStorage.clear()
})

const bodyRows = () => screen.getAllByRole("row").slice(1)

describe("MonthTable pages", () => {
	it("shows 10 rows on page 1 with the pagination", async () => {
		mockPages(all)
		setup()
		expect(await screen.findByText("Expense 1")).toBeInTheDocument()
		expect(bodyRows()).toHaveLength(10)
		expect(
			screen.getByRole("navigation", { name: "Pagination" })
		).toHaveTextContent("Page 1 of 5")
	})

	it("shows the last 5 rows on page 5", async () => {
		nav.search = "period=2026-11&page=5"
		const getPage = mockPages(all)
		setup()
		expect(await screen.findByText("Expense 45")).toBeInTheDocument()
		expect(bodyRows()).toHaveLength(5)
		expect(getPage).toHaveBeenCalledWith(
			"expenses",
			expect.objectContaining({ budgetPeriodId: "p1", page: 5, limit: 10 })
		)
	})

	it("goes to the next page keeping the period", async () => {
		mockPages(all)
		const user = setup()
		await screen.findByText("Expense 1")
		await user.click(screen.getByRole("button", { name: "Next page" }))
		expect(nav.push).toHaveBeenCalledWith("?period=2026-11&page=2", {
			scroll: false
		})
	})

	it("shows which expenses are on the page", async () => {
		nav.search = "period=2026-11&page=5"
		mockPages(all)
		setup()
		expect(
			await screen.findByText("Showing 41–45 of 45 expenses")
		).toBeInTheDocument()
	})

	it("hides the page buttons for a single page", async () => {
		mockPages(all.slice(0, 10))
		setup()
		await screen.findByText("Expense 1")
		expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull()
		expect(screen.getByText("Showing 1–10 of 10 expenses")).toBeInTheDocument()
	})

	it("moves to the last page when the page no longer exists", async () => {
		nav.search = "period=2026-11&page=9"
		mockPages(all)
		setup()
		await vi.waitFor(() =>
			expect(nav.replace).toHaveBeenCalledWith("?period=2026-11&page=5", {
				scroll: false
			})
		)
	})
})

describe("MonthTable sorting", () => {
	it("makes every column but # and the menu a sort button", async () => {
		mockPages(all.slice(0, 1))
		setup()
		await screen.findByText("Expense 1")
		const buttons = within(screen.getAllByRole("row")[0]).getAllByRole("button")
		expect(buttons.map((b) => b.textContent)).toEqual([
			"Item",
			"Category",
			"Payment Type",
			"Due",
			"Paid",
			"Amount"
		])
		expect(screen.getByRole("columnheader", { name: "Item" })).toHaveAttribute(
			"aria-sort",
			"none"
		)
		expect(screen.getByRole("columnheader", { name: "#" })).not.toHaveAttribute(
			"aria-sort"
		)
	})

	it("asks the server for the sort and marks the header", async () => {
		nav.search = "period=2026-11&sortBy=dueAt&sortOrder=asc"
		const getPage = mockPages(all)
		setup()
		await screen.findByText("Expense 1")
		expect(getPage).toHaveBeenCalledWith(
			"expenses",
			expect.objectContaining({ sortBy: "dueAt", sortOrder: "asc", page: 1 })
		)
		expect(screen.getByRole("columnheader", { name: "Due" })).toHaveAttribute(
			"aria-sort",
			"ascending"
		)
	})

	it("sorts a header click back on page 1, keeping the period", async () => {
		nav.search = "period=2026-11&page=3"
		mockPages(all)
		const user = setup()
		await screen.findByText("Expense 21")
		await user.click(screen.getByRole("button", { name: "Amount" }))
		expect(nav.push).toHaveBeenCalledWith(
			"?period=2026-11&sortBy=amount&sortOrder=asc",
			{ scroll: false }
		)
	})

	it("restores the default on the third click", async () => {
		nav.search = "period=2026-11&sortBy=amount&sortOrder=desc"
		mockPages(all)
		const user = setup()
		await screen.findByText("Expense 1")
		await user.click(screen.getByRole("button", { name: "Amount" }))
		expect(nav.push).toHaveBeenCalledWith("?period=2026-11", {
			scroll: false
		})
	})
})

describe("MonthTable rows", () => {
	it("shows the columns of the design", async () => {
		mockPages(all.slice(0, 1))
		setup()
		await screen.findByText("Expense 1")
		const headers = screen
			.getAllByRole("columnheader")
			.map((h) => h.textContent)
		expect(headers).toEqual([
			"#",
			"Item",
			"Category",
			"Payment Type",
			"Due",
			"Paid",
			"Amount",
			"Actions"
		])
	})

	it("marks an unpaid expense due before today as overdue", async () => {
		mockPages([expense(1, { description: "Hydro bill", dueAt: "2026-11-12" })])
		setup()
		const row = (await screen.findByText("Hydro bill")).closest(
			"tr"
		) as HTMLElement
		expect(within(row).getByText("Overdue")).toBeInTheDocument()
		expect(within(row).getByText("12 Nov")).toHaveClass("text-danger")
	})

	it("does not mark a paid or not-yet-due expense as overdue", async () => {
		mockPages([
			expense(1, { dueAt: "2026-11-12", paidAt: "2026-11-10" }),
			expense(2, { dueAt: "2026-11-15" })
		])
		setup()
		await screen.findByText("Expense 1")
		expect(screen.queryByText("Overdue")).toBeNull()
	})

	it("dims a paid row but not its checkbox, and shows the paid date", async () => {
		mockPages([expense(1, { paidAt: "2026-11-01", dueAt: "2026-11-01" })])
		setup()
		const row = (await screen.findByText("Expense 1")).closest(
			"tr"
		) as HTMLElement
		const checkbox = within(row).getByRole("checkbox", {
			name: "Paid: Expense 1"
		})
		expect(checkbox).toBeChecked()
		expect(checkbox.closest("td")).not.toHaveClass("opacity-50")
		expect(within(row).getAllByText("1 Nov").length).toBeGreaterThan(0)
		expect(within(row).getByText("$100.00").closest("td")).toHaveClass(
			"opacity-50"
		)
	})

	it("shows a dash when there is no due date", async () => {
		mockPages([expense(1, { dueAt: null })])
		setup()
		const row = (await screen.findByText("Expense 1")).closest(
			"tr"
		) as HTMLElement
		expect(within(row).getByText("—")).toBeInTheDocument()
	})

	it("shows installment and recurring chips, and none for one-time", async () => {
		mockPages([
			expense(1, {
				description: "Car finance",
				installmentNumber: 79,
				installment: {
					id: "g1",
					totalInstallments: 104,
					paymentIntervalDays: 14,
					firstPurchasedAt: "2020-01-01"
				}
			}),
			expense(2, {
				description: "Hydro bill",
				recurringExpenseId: "r1",
				monthsRunning: 11
			}),
			expense(3, { description: "Plain" })
		])
		setup()
		await screen.findByText("Car finance")
		expect(screen.getByText("79/104")).toBeInTheDocument()
		expect(screen.getByText("11")).toBeInTheDocument()
		const plain = screen.getByText("Plain").closest("tr") as HTMLElement
		expect(plain.querySelector("td")).toBeEmptyDOMElement()
	})

	it("shows the real name of a deleted lookup as given by the API", async () => {
		mockPages([expense(1, { category: { id: "x", name: "Old category" } })])
		setup()
		expect(await screen.findByText("Old category")).toBeInTheDocument()
	})

	it("selects a row on click and keeps the checkbox and menu from selecting", async () => {
		mockPages(all.slice(0, 2))
		const onSelectRow = vi.fn()
		const user = setup({ onSelectRow, onEdit: vi.fn() })
		const row = (await screen.findByText("Expense 1")).closest(
			"tr"
		) as HTMLElement
		await user.click(within(row).getByRole("checkbox"))
		await user.click(
			within(row).getByRole("button", { name: "Actions for Expense 1" })
		)
		expect(onSelectRow).not.toHaveBeenCalled()
		// The open menu hides the rest of the page from assistive tech
		await user.keyboard("{Escape}")
		await user.click(screen.getByRole("button", { name: "Expense 1" }))
		expect(onSelectRow).toHaveBeenCalledOnce()
		expect(onSelectRow.mock.calls[0][0].expense.id).toBe("1")
		await user.click(row)
		expect(onSelectRow).toHaveBeenCalledTimes(2)
	})

	it("edits a row from its menu without selecting it", async () => {
		mockPages(all.slice(0, 2))
		const onSelectRow = vi.fn()
		const onEdit = vi.fn()
		const user = setup({ onSelectRow, onEdit })
		await user.click(
			await screen.findByRole("button", { name: "Actions for Expense 2" })
		)
		await user.click(screen.getByRole("menuitem", { name: "Edit" }))
		expect(onEdit).toHaveBeenCalledOnce()
		expect(onEdit.mock.calls[0][0].id).toBe("2")
		expect(onSelectRow).not.toHaveBeenCalled()
	})

	it("has no row menu without an edit handler or when the month can't be edited", async () => {
		mockPages(all.slice(0, 2))
		setup({ canEdit: false, onEdit: vi.fn() })
		await screen.findByText("Expense 1")
		expect(
			screen.queryByRole("button", { name: /Actions for/ })
		).not.toBeInTheDocument()
	})

	it("highlights the row whose details are open", async () => {
		mockPages(all.slice(0, 2))
		setup({ selectedId: "2" })
		const selected = (await screen.findByText("Expense 2")).closest("tr")
		const other = screen.getByText("Expense 1").closest("tr")
		expect(selected).toHaveAttribute("aria-current", "true")
		expect(other).not.toHaveAttribute("aria-current")
	})
})

describe("MonthTable states", () => {
	it("shows a loading status", () => {
		vi.spyOn(api, "getPage").mockReturnValue(new Promise(() => {}))
		setup()
		expect(screen.getByRole("status")).toHaveTextContent("Loading expenses")
	})

	it("shows the error with a Retry", async () => {
		const getPage = vi
			.spyOn(api, "getPage")
			.mockRejectedValueOnce(new ApiError("boom", 500))
		const user = setup()
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Couldn't load the expenses"
		)
		mockPages(all.slice(0, 1))
		await user.click(screen.getByRole("button", { name: "Retry" }))
		expect(await screen.findByText("Expense 1")).toBeInTheDocument()
		expect(getPage).toHaveBeenCalled()
	})

	it("shows the empty state with an Add button that calls back", async () => {
		mockPages([])
		const onAddExpense = vi.fn()
		const user = setup({ onAddExpense })
		expect(await screen.findByText("No expenses yet")).toBeInTheDocument()
		await user.click(screen.getByRole("button", { name: "Add expense" }))
		expect(onAddExpense).toHaveBeenCalled()
	})

	it("hides the Add button in a closed month", async () => {
		mockPages([])
		setup({ canEdit: false, onAddExpense: vi.fn() })
		await screen.findByText("No expenses yet")
		expect(screen.queryByRole("button", { name: "Add expense" })).toBeNull()
	})
})

describe("MonthTable on the phone", () => {
	beforeEach(() => {
		window.matchMedia = ((query: string) => ({
			matches: true,
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {}
		})) as unknown as typeof window.matchMedia
	})
	afterEach(() => {
		// biome-ignore lint/suspicious/noExplicitAny: removing the test stub
		delete (window as any).matchMedia
	})

	it("has no sort buttons", async () => {
		mockPages(all.slice(0, 1))
		setup()
		await screen.findByText("Expense 1")
		expect(screen.queryByRole("button", { name: "Due" })).toBeNull()
	})

	it("renders a list with the date line instead of a table", async () => {
		mockPages([
			expense(1, { description: "Hydro bill", dueAt: "2026-11-12" }),
			expense(2, { description: "Rent", dueAt: "2026-11-28" }),
			expense(3, {
				description: "Savings",
				paidAt: "2026-11-01",
				dueAt: "2026-11-01"
			})
		])
		setup()
		await screen.findByText("Hydro bill")
		expect(screen.queryByRole("table")).toBeNull()
		expect(screen.getByRole("list", { name: "Expenses" })).toBeInTheDocument()
		expect(screen.getByText("Overdue · 12 Nov")).toBeInTheDocument()
		expect(screen.getByText("Due 28 Nov")).toBeInTheDocument()
		expect(screen.getByText("Paid 1 Nov")).toBeInTheDocument()
		expect(screen.getAllByText("$100.00")).toHaveLength(3)
	})
})
