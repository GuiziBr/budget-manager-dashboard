// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import { MonthScreen } from "./MonthScreen"

// The address is a small store, so push, replace and back change what the screen reads
const nav = vi.hoisted(() => ({
	search: "",
	history: [] as string[],
	listeners: new Set<() => void>(),
	cache: { key: "", params: new URLSearchParams() }
}))
const notify = () => {
	for (const listener of nav.listeners) listener()
}
const toSearch = (href: string) => href.replace(/^\?/, "")
const toast = vi.hoisted(() => ({ error: vi.fn() }))
vi.mock("sonner", () => ({ toast }))
vi.mock("next/navigation", async () => {
	const { useSyncExternalStore } = await import("react")
	const snapshot = () => {
		if (nav.cache.key !== nav.search) {
			nav.cache = { key: nav.search, params: new URLSearchParams(nav.search) }
		}
		return nav.cache.params
	}
	const subscribe = (listener: () => void) => {
		nav.listeners.add(listener)
		return () => nav.listeners.delete(listener)
	}
	const router = {
		push: (href: string) => {
			nav.history.push(nav.search)
			nav.search = toSearch(href)
			notify()
		},
		replace: (href: string) => {
			nav.search = toSearch(href)
			notify()
		},
		back: () => {
			nav.search = nav.history.pop() ?? ""
			notify()
		}
	}
	return {
		useSearchParams: () => useSyncExternalStore(subscribe, snapshot, snapshot),
		useRouter: () => router
	}
})

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
	nav.history = []
	toast.error.mockClear()
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

	it("shows a Past month pill that explains the envelope exception", async () => {
		nav.search = "period=2026-10"
		vi.spyOn(api, "get").mockResolvedValue([make(2026, 10)])
		const user = setup()
		// One pill for the phone and one for desktop; CSS shows only one of them
		const [pill] = await screen.findAllByRole("button", { name: "Past month" })
		await user.click(pill)
		expect(
			await screen.findByText(
				"You can edit this month. Envelopes of past months can't be changed."
			)
		).toBeInTheDocument()
	})

	it("shows no Past month pill in the current month", async () => {
		vi.spyOn(api, "getPage").mockResolvedValue({
			data: [],
			total: 0,
			totalAmount: 0,
			page: 1,
			limit: 10
		} as never)
		vi.spyOn(api, "get").mockResolvedValue([make(2026, 11)])
		setup()
		await screen.findByRole("region", { name: "Month summary" })
		expect(screen.queryByRole("button", { name: "Past month" })).toBeNull()
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

	it("is hidden on desktop, where the header has the Add menu instead", async () => {
		stubPhone(false)
		openMonth("")
		setup()
		await screen.findByRole("region", { name: "Month summary" })
		expect(
			screen.queryByRole("button", {
				name: "Add",
				description: "Drag to move, or use the arrow keys"
			})
		).toBeNull()
		expect(screen.getByRole("button", { name: "Add" })).toBeVisible()
	})

	it("shows in a past month, which is edited like the current one", async () => {
		stubPhone(true)
		openMonth("period=2026-10")
		setup()
		expect(await screen.findByRole("button", { name: "Add" })).toBeVisible()
	})
})

describe("MonthScreen add expense", () => {
	const stubPhone = (matches: boolean) =>
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches,
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {}
		}))
	const openMonth = (
		search: string,
		periods = [make(2026, 11), make(2026, 10)]
	) => {
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
				endpoint.includes("budget-periods") ? periods : []
			)) as never)
	}
	afterEach(() => vi.unstubAllGlobals())

	it("opens the form from the header Add menu on desktop", async () => {
		stubPhone(false)
		openMonth("")
		const user = setup()
		await user.click(await screen.findByRole("button", { name: "Add" }))
		await user.click(await screen.findByRole("menuitem", { name: /Expense/ }))
		expect(
			await screen.findByRole("dialog", { name: "Add expense" })
		).toHaveTextContent("November 2026")
	})

	it("opens the form from the floating button's menu on the phone", async () => {
		stubPhone(true)
		openMonth("")
		const user = setup()
		const fab = await screen.findByRole("button", { name: "Add" })
		await user.click(fab)
		expect(fab).toHaveAttribute("aria-expanded", "true")
		await user.click(await screen.findByRole("menuitem", { name: /Expense/ }))
		expect(
			await screen.findByRole("dialog", { name: "Add expense" })
		).toBeVisible()
	})

	it("closes the phone menu with a second press on the button", async () => {
		stubPhone(true)
		openMonth("")
		const user = setup()
		const fab = await screen.findByRole("button", { name: "Add" })
		await user.click(fab)
		await screen.findByRole("menuitem", { name: /Expense/ })
		await user.click(fab)
		await vi.waitFor(() =>
			expect(screen.queryByRole("menuitem")).not.toBeInTheDocument()
		)
		expect(fab).toHaveAttribute("aria-expanded", "false")
	})

	it("opens the form from the empty table", async () => {
		stubPhone(false)
		openMonth("")
		const user = setup()
		await user.click(await screen.findByRole("button", { name: "Add expense" }))
		expect(
			await screen.findByRole("dialog", { name: "Add expense" })
		).toBeVisible()
	})

	it("adds to a past month too", async () => {
		stubPhone(false)
		openMonth("period=2026-10")
		const user = setup()
		await user.click(await screen.findByRole("button", { name: "Add" }))
		await user.click(await screen.findByRole("menuitem", { name: /Expense/ }))
		expect(
			await screen.findByRole("dialog", { name: "Add expense" })
		).toHaveTextContent("October 2026")
	})

	it("has no Add menu in a month that isn't opened", async () => {
		stubPhone(false)
		openMonth("period=2027-03")
		setup()
		await screen.findByText("March 2027 hasn't been opened yet")
		expect(screen.queryByRole("button", { name: "Add" })).toBeNull()
	})

	it("closes the form on Escape", async () => {
		stubPhone(false)
		openMonth("")
		const user = setup()
		await user.click(await screen.findByRole("button", { name: "Add" }))
		await user.click(await screen.findByRole("menuitem", { name: /Expense/ }))
		await screen.findByRole("dialog", { name: "Add expense" })
		await user.keyboard("{Escape}")
		await vi.waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		)
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

	it("doesn't reopen the panel when coming back to a month", async () => {
		open()
		const { wrapper } = createQueryWrapper()
		const { rerender } = render(<MonthScreen />, { wrapper })
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
		await user.click(await screen.findByRole("button", { name: /View all/ }))
		await screen.findByText("Pay day")

		// Back and forward leave the panel open's month, then return to it
		nav.search = "period=2026-10"
		rerender(<MonthScreen />)
		await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
		nav.search = ""
		rerender(<MonthScreen />)
		await screen.findByRole("region", { name: "Month summary" })
		expect(screen.queryByRole("dialog")).toBeNull()
	})

	it("doesn't reopen the panel after a month that isn't opened", async () => {
		open()
		const { wrapper } = createQueryWrapper()
		const { rerender } = render(<MonthScreen />, { wrapper })
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
		await user.click(await screen.findByRole("button", { name: /View all/ }))
		await screen.findByText("Pay day")

		nav.search = "period=2027-03"
		rerender(<MonthScreen />)
		await screen.findByText(/hasn't been opened/)
		nav.search = ""
		rerender(<MonthScreen />)
		await screen.findByRole("region", { name: "Month summary" })
		expect(screen.queryByRole("dialog")).toBeNull()
	})

	it("has edit controls in a past month", async () => {
		open("period=2026-10")
		const user = setup()
		await user.click(await screen.findByRole("button", { name: /View all/ }))
		await screen.findByText("Pay day")
		expect(screen.getByRole("button", { name: "Add income" })).toBeVisible()
	})
})

describe("MonthScreen details panel", () => {
	// Shared-link ids for an expense/envelope outside the page/list on screen: real UUIDs, unlike "x1"/"e1" below
	const HYDRO_ID = "11111111-1111-4111-8111-111111111111"
	const FAR_EXPENSE_ID = "77777777-7777-4777-8777-777777777777"
	const OLD_ENVELOPE_ID = "66666666-6666-4666-8666-666666666666"

	const expenseIn = (id: string, periodId: string, description: string) => ({
		id,
		budgetPeriodId: periodId,
		recurringExpenseId: null,
		description,
		installmentNumber: null,
		purchasedAt: null,
		dueAt: "2026-11-28",
		paidAt: null,
		amount: 120,
		category: { id: "c1", name: "Utilities" },
		paymentType: { id: "t1", name: "Debit" },
		bank: null,
		store: null,
		installment: null,
		monthsRunning: null,
		createdAt: "",
		updatedAt: "",
		deletedAt: null
	})
	const hydro = expenseIn(HYDRO_ID, "2026-11", "Hydro bill")
	const envelope = (id: string, periodId: string) => ({
		id,
		budgetPeriodId: periodId,
		categoryId: "c9",
		allocatedAmount: 400,
		spentAmount: 90,
		spendUpdatedAt: null
	})

	const open = (
		search = "",
		listed = hydro,
		others: unknown[] = [],
		secondPage: unknown[] = []
	) => {
		nav.search = search
		vi.spyOn(api, "getPage").mockImplementation((async (
			_endpoint: string,
			params?: { page?: number }
		) => {
			const page = Number(params?.page ?? 1)
			return {
				data: page === 2 ? secondPage : [listed, ...others],
				// A second page needs more than one page of expenses
				total: secondPage.length ? 11 : 1 + others.length,
				totalAmount: 120,
				page,
				limit: 10
			}
		}) as never)
		return vi.spyOn(api, "get").mockImplementation(((endpoint: string) => {
			if (endpoint === `expenses/${HYDRO_ID}`) return Promise.resolve(listed)
			if (endpoint === `expenses/${FAR_EXPENSE_ID}`)
				return Promise.resolve(expenseIn(FAR_EXPENSE_ID, "2026-10", "Far away"))
			if (endpoint === `budget-envelopes/${OLD_ENVELOPE_ID}`)
				return Promise.resolve(envelope(OLD_ENVELOPE_ID, "2026-10"))
			if (
				endpoint.startsWith("expenses/") ||
				endpoint.startsWith("budget-envelopes/")
			)
				return Promise.reject(new ApiError("not found", 404))
			return Promise.resolve(
				endpoint.includes("budget-periods")
					? [make(2026, 11), make(2026, 10)]
					: endpoint.startsWith("categories")
						? [{ id: "c9", name: "Groceries" }]
						: endpoint.startsWith("budget-envelopes")
							? [envelope("e1", "2026-11")]
							: []
			)
		}) as never)
	}

	it("puts the expense in the address and opens its details", async () => {
		const get = open()
		const user = setup()
		await user.click(await screen.findByRole("button", { name: "Hydro bill" }))
		const dialog = await screen.findByRole("dialog")
		expect(nav.search).toBe(`expense=${HYDRO_ID}`)
		expect(dialog).toHaveTextContent("Hydro bill")
		expect(dialog).toHaveTextContent("Debit")
		// The page behind a modal panel is hidden from the accessibility tree
		expect(
			screen
				.getByRole("button", { name: "Hydro bill", hidden: true })
				.closest("tr")
		).toHaveAttribute("aria-current", "true")
		// The row was cached when clicked, so the API isn't asked for it
		expect(get).not.toHaveBeenCalledWith(`expenses/${HYDRO_ID}`)
	})

	it("closes with Escape, goes back in history and returns the focus", async () => {
		open()
		const user = setup()
		const item = await screen.findByRole("button", { name: "Hydro bill" })
		await user.click(item)
		await screen.findByRole("dialog")
		await user.keyboard("{Escape}")
		await vi.waitFor(() => expect(item).toHaveFocus())
		expect(nav.search).toBe("")
		expect(screen.queryByRole("dialog")).toBeNull()
		expect(item.closest("tr")).not.toHaveAttribute("aria-current")
	})

	it("steps to the next and previous expense, updating the address without adding history", async () => {
		const get = open("", hydro, [expenseIn("x2", "2026-11", "Water bill")])
		const user = setup()
		await user.click(await screen.findByRole("button", { name: "Hydro bill" }))
		const dialog = await screen.findByRole("dialog")
		const historyAfterOpen = nav.history.length

		await user.click(screen.getByRole("button", { name: "Next expense" }))
		await vi.waitFor(() => expect(nav.search).toBe("expense=x2"))
		expect(screen.getByRole("dialog")).toHaveTextContent("Water bill")
		expect(nav.history).toHaveLength(historyAfterOpen)
		expect(get).not.toHaveBeenCalledWith("expenses/x2")

		await user.click(screen.getByRole("button", { name: "Previous expense" }))
		await vi.waitFor(() => expect(nav.search).toBe(`expense=${HYDRO_ID}`))
		expect(dialog).toHaveTextContent("Hydro bill")

		// One step back from wherever it ended closes it
		await user.keyboard("{Escape}")
		await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
		expect(nav.search).toBe("")
	})

	it("continues onto the next and the previous page, and the table follows", async () => {
		open(
			"",
			hydro,
			[expenseIn("x2", "2026-11", "Water bill")],
			[expenseIn("x3", "2026-11", "Gas bill")]
		)
		const user = setup()
		await user.click(await screen.findByRole("button", { name: "Hydro bill" }))
		await screen.findByRole("dialog")
		const params = () => new URLSearchParams(nav.search)

		await user.click(screen.getByRole("button", { name: "Next expense" }))
		await vi.waitFor(() => expect(params().get("expense")).toBe("x2"))

		// Water bill is the last row of page 1: Next waits for page 2, then moves there
		const next = screen.getByRole("button", { name: "Next expense" })
		await vi.waitFor(() => expect(next).toBeEnabled())
		await user.click(next)
		await vi.waitFor(() => expect(params().get("expense")).toBe("x3"))
		expect(params().get("page")).toBe("2")
		expect(screen.getByRole("dialog")).toHaveTextContent("Gas bill")
		expect(
			screen
				.getByRole("button", { name: "Gas bill", hidden: true })
				.closest("tr")
		).toHaveAttribute("aria-current", "true")

		// Gas bill is the first row of page 2: Previous goes back to the end of page 1
		const previous = screen.getByRole("button", { name: "Previous expense" })
		await vi.waitFor(() => expect(previous).toBeEnabled())
		await user.click(previous)
		await vi.waitFor(() => expect(params().get("expense")).toBe("x2"))
		expect(params().get("page")).toBeNull()
		expect(screen.getByRole("dialog")).toHaveTextContent("Water bill")
	})

	it("opens the expense named in a pasted link and removes the param on close", async () => {
		open(`period=2026-11&expense=${HYDRO_ID}`)
		const user = setup()
		const dialog = await screen.findByRole("dialog")
		expect(dialog).toHaveTextContent("Hydro bill")
		await user.keyboard("{Escape}")
		await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
		expect(nav.search).toBe("period=2026-11")
	})

	it("switches to the month of a linked expense that is somewhere else", async () => {
		open(`period=2026-11&expense=${FAR_EXPENSE_ID}`)
		setup()
		const dialog = await screen.findByRole("dialog")
		expect(dialog).toHaveTextContent("Far away")
		await vi.waitFor(() =>
			expect(new URLSearchParams(nav.search).get("period")).toBe("2026-10")
		)
		expect(new URLSearchParams(nav.search).get("expense")).toBe(FAR_EXPENSE_ID)
		expect(
			await screen.findByRole("button", { name: /October 2026/, hidden: true })
		).toBeInTheDocument()
	})

	it("uses the linked month even when the address has no period", async () => {
		open(`expense=${FAR_EXPENSE_ID}`)
		setup()
		await screen.findByRole("dialog")
		await vi.waitFor(() =>
			expect(new URLSearchParams(nav.search).get("period")).toBe("2026-10")
		)
	})

	it("says so and drops the param when the linked expense doesn't exist", async () => {
		open("period=2026-11&expense=gone")
		setup()
		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"This expense no longer exists.",
				{ id: "linked-selection" }
			)
		)
		expect(nav.search).toBe("period=2026-11")
		expect(screen.queryByRole("dialog")).toBeNull()
	})

	it("drops a tampered link without requesting it, instead of following it to another endpoint", async () => {
		const get = open("period=2026-11&expense=..%2Fcategories")
		setup()
		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"This expense no longer exists.",
				{ id: "linked-selection" }
			)
		)
		expect(
			get.mock.calls.some(([endpoint]) => String(endpoint).includes(".."))
		).toBe(false)
		expect(screen.queryByRole("dialog")).toBeNull()
	})

	it("puts the envelope in the address and opens its details", async () => {
		const get = open()
		const user = setup()
		await user.click(await screen.findByRole("button", { name: /Groceries/ }))
		const dialog = await screen.findByRole("dialog")
		expect(nav.search).toBe("envelope=e1")
		expect(dialog).toHaveTextContent("Groceries")
		expect(dialog).toHaveTextContent("$310.00")
		expect(get).not.toHaveBeenCalledWith("budget-envelopes/e1")
	})

	it("opens the envelope named in a pasted link, in its own month", async () => {
		open(`period=2026-11&envelope=${OLD_ENVELOPE_ID}`)
		setup()
		expect(await screen.findByRole("dialog")).toHaveTextContent("Groceries")
		await vi.waitFor(() =>
			expect(new URLSearchParams(nav.search).get("period")).toBe("2026-10")
		)
	})

	it("says so and drops the param when the linked envelope doesn't exist", async () => {
		open("period=2026-11&envelope=nope")
		setup()
		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"This envelope no longer exists.",
				{ id: "linked-selection" }
			)
		)
		expect(nav.search).toBe("period=2026-11")
	})

	it("closes the details when the month changes", async () => {
		open()
		const { wrapper } = createQueryWrapper()
		const { rerender } = render(<MonthScreen />, { wrapper })
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
		await user.click(await screen.findByRole("button", { name: "Hydro bill" }))
		await screen.findByRole("dialog")

		// A month link carries no selection
		nav.search = "period=2026-10"
		rerender(<MonthScreen />)
		await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
	})

	it("shows the expense actions in a past month", async () => {
		open("period=2026-10", expenseIn("x1", "2026-10", "Hydro bill"))
		const user = setup()
		await user.click(await screen.findByRole("button", { name: "Hydro bill" }))
		const dialog = await screen.findByRole("dialog")
		expect(dialog).toHaveTextContent("Hydro bill")
		expect(screen.getByRole("button", { name: /Mark as/ })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument()
	})

	it("still hides Delete on an envelope in a past month", async () => {
		open(`period=2026-10&envelope=${OLD_ENVELOPE_ID}`)
		setup()
		expect(await screen.findByRole("dialog")).toHaveTextContent("Groceries")
		expect(screen.queryByRole("button", { name: "Delete" })).toBeNull()
	})
})

describe("MonthScreen mark paid", () => {
	const ID = "11111111-1111-4111-8111-111111111111"
	const bill = (patch: Record<string, unknown> = {}) => ({
		id: ID,
		budgetPeriodId: "2026-11",
		recurringExpenseId: null,
		description: "Hydro bill",
		installmentNumber: null,
		purchasedAt: null,
		dueAt: "2026-11-28",
		paidAt: null,
		amount: 120,
		category: { id: "c1", name: "Utilities" },
		paymentType: { id: "t1", name: "Debit" },
		bank: null,
		store: null,
		installment: null,
		monthsRunning: null,
		createdAt: "",
		updatedAt: "",
		deletedAt: null,
		...patch
	})

	// The server keeps the row, so a refetch after the PATCH returns what was saved
	const open = (
		search: string,
		patch: Record<string, unknown>,
		failure?: ApiError
	) => {
		nav.search = search
		let saved = bill(patch)
		vi.spyOn(api, "getPage").mockImplementation((async () => ({
			data: [saved],
			total: 1,
			totalAmount: 120,
			page: 1,
			limit: 10
		})) as never)
		vi.spyOn(api, "get").mockImplementation(((endpoint: string) =>
			Promise.resolve(
				endpoint.includes("budget-periods")
					? [make(2026, 11), make(2026, 10)]
					: []
			)) as never)
		return vi.spyOn(api, "patch").mockImplementation((async (
			_endpoint: string,
			body: Record<string, unknown>
		) => {
			if (failure) throw failure
			saved = { ...saved, ...body }
			return saved
		}) as never)
	}

	it("ticks an unpaid row with today's date", async () => {
		const patch = open("", {})
		const user = setup()
		await user.click(
			await screen.findByRole("checkbox", { name: "Not paid: Hydro bill" })
		)
		expect(patch).toHaveBeenCalledWith(`expenses/${ID}`, {
			paidAt: "2026-11-02"
		})
		expect(
			await screen.findByRole("checkbox", { name: "Paid: Hydro bill" })
		).toBeChecked()
		expect(await screen.findAllByText("2 Nov")).not.toHaveLength(0)
	})

	it("unticks a paid row by clearing the date", async () => {
		const patch = open("", { paidAt: "2026-11-01" })
		const user = setup()
		await user.click(
			await screen.findByRole("checkbox", { name: "Paid: Hydro bill" })
		)
		expect(patch).toHaveBeenCalledWith(`expenses/${ID}`, { paidAt: null })
		expect(
			await screen.findByRole("checkbox", { name: "Not paid: Hydro bill" })
		).not.toBeChecked()
	})

	it("doesn't open the details when the checkbox is clicked", async () => {
		open("", {})
		const user = setup()
		await user.click(
			await screen.findByRole("checkbox", { name: "Not paid: Hydro bill" })
		)
		expect(screen.queryByRole("dialog")).toBeNull()
	})

	it("puts the checkbox back and shows an error toast when the update fails", async () => {
		open("", {}, new ApiError("boom", 500))
		const user = setup()
		await user.click(
			await screen.findByRole("checkbox", { name: "Not paid: Hydro bill" })
		)
		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Couldn't update the paid status. Try again.",
				{ id: "paid-update-failed" }
			)
		)
		expect(
			await screen.findByRole("checkbox", { name: "Not paid: Hydro bill" })
		).not.toBeChecked()
	})

	it("shows the generic failure on a 422, which expenses no longer return", async () => {
		open("", {}, new ApiError("closed", 422))
		const user = setup()
		await user.click(
			await screen.findByRole("checkbox", { name: "Not paid: Hydro bill" })
		)
		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Couldn't update the paid status. Try again.",
				{ id: "paid-update-failed" }
			)
		)
	})

	it("marks paid and unpaid from the details panel", async () => {
		const patch = open("", {})
		const user = setup()
		await user.click(await screen.findByRole("button", { name: "Hydro bill" }))
		await user.click(
			await screen.findByRole("button", { name: "Mark as paid today" })
		)
		expect(patch).toHaveBeenLastCalledWith(`expenses/${ID}`, {
			paidAt: "2026-11-02"
		})
		await user.click(
			await screen.findByRole("button", { name: "Mark as unpaid" })
		)
		expect(patch).toHaveBeenLastCalledWith(`expenses/${ID}`, { paidAt: null })
	})

	it("marks paid in a past month too", async () => {
		const patch = open("period=2026-10", { budgetPeriodId: "2026-10" })
		const user = setup()
		await user.click(
			await screen.findByRole("checkbox", { name: "Not paid: Hydro bill" })
		)
		expect(patch).toHaveBeenCalledWith(`expenses/${ID}`, {
			paidAt: "2026-11-02"
		})
	})
})
