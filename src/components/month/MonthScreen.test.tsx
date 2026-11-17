// @vitest-environment jsdom
import { act, render, screen, within } from "@testing-library/react"
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
const toast = vi.hoisted(() => ({
	error: vi.fn(),
	success: vi.fn(),
	info: vi.fn()
}))
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
	toast.success.mockClear()
	toast.info.mockClear()
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
		).toBeEnabled()
	})

	describe("opening a month", () => {
		const openButton = () =>
			screen.findByRole("button", { name: "Open November 2026" })
		const openAndConfirm = async (user: ReturnType<typeof setup>) => {
			await user.click(await openButton())
			const dialog = await screen.findByRole("dialog")
			await user.click(
				within(dialog).getByRole("button", { name: "Open November 2026" })
			)
		}

		it("asks for confirmation and sends nothing when cancelled", async () => {
			vi.spyOn(api, "get").mockResolvedValue([])
			const post = vi.spyOn(api, "post")
			const user = setup()
			await user.click(await openButton())
			const dialog = await screen.findByRole("dialog", {
				name: "Open November 2026?"
			})
			expect(dialog).toHaveTextContent(
				"This creates November 2026 with its installments, recurring bills and envelopes."
			)
			await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
			expect(post).not.toHaveBeenCalled()
			// Focus goes back to the Open button, not to the page
			await vi.waitFor(() => expect(openButton()).resolves.toHaveFocus())
		})

		it("posts the month and shows it once created", async () => {
			let periods: ReturnType<typeof make>[] = []
			vi.spyOn(api, "get").mockImplementation(async (endpoint) =>
				String(endpoint).includes("budget-periods") ? periods : []
			)
			vi.spyOn(api, "getPage").mockReturnValue(new Promise(() => {}))
			const post = vi.spyOn(api, "post").mockImplementation(async () => {
				periods = [make(2026, 11)]
				return make(2026, 11)
			})
			const user = setup()
			await openAndConfirm(user)
			expect(post).toHaveBeenCalledWith("budget-periods", {
				year: 2026,
				month: 11
			})
			await vi.waitFor(() =>
				expect(
					screen.queryByText("November 2026 hasn't been opened yet")
				).not.toBeInTheDocument()
			)
		})

		it("opens the review of the new month after a 201 (M-02)", async () => {
			let periods: ReturnType<typeof make>[] = []
			vi.spyOn(api, "get").mockImplementation(async (endpoint) =>
				String(endpoint).includes("budget-periods") ? periods : []
			)
			vi.spyOn(api, "getPage").mockResolvedValue({
				data: [],
				total: 0,
				totalAmount: 0,
				page: 1,
				limit: 100
			} as never)
			vi.spyOn(api, "post").mockImplementation(async () => {
				periods = [make(2026, 11)]
				return make(2026, 11)
			})
			const user = setup()
			await openAndConfirm(user)
			expect(
				await screen.findByRole("dialog", { name: "Review" })
			).toHaveTextContent("November 2026")
			// Closing without Done leaves the month as generated
			await user.keyboard("{Escape}")
			await vi.waitFor(() =>
				expect(
					screen.queryByRole("dialog", { name: "Review" })
				).not.toBeInTheDocument()
			)
		})

		it("opens no review when the month changed while it was being created", async () => {
			vi.spyOn(api, "get").mockResolvedValue([])
			let created: (period: ReturnType<typeof make>) => void = () => {}
			vi.spyOn(api, "post").mockReturnValue(
				new Promise((resolve) => {
					created = resolve as typeof created
				})
			)
			const user = setup()
			await openAndConfirm(user)
			await vi.waitFor(() => expect(api.post).toHaveBeenCalled())

			act(() => {
				nav.search = "period=2026-12"
				notify()
			})
			await act(async () => created(make(2026, 11)))

			expect(
				screen.queryByRole("dialog", { name: "Review" })
			).not.toBeInTheDocument()
		})

		it("opens no review on a 409", async () => {
			vi.spyOn(api, "get").mockResolvedValue([])
			vi.spyOn(api, "post").mockRejectedValue(new ApiError("exists", 409))
			const user = setup()
			await openAndConfirm(user)
			await vi.waitFor(() => expect(toast.info).toHaveBeenCalled())
			expect(
				screen.queryByRole("dialog", { name: "Review" })
			).not.toBeInTheDocument()
		})

		it("disables the button while the request is pending", async () => {
			vi.spyOn(api, "get").mockResolvedValue([])
			const post = vi.spyOn(api, "post").mockReturnValue(new Promise(() => {}))
			const user = setup()
			await openAndConfirm(user)
			expect(await openButton()).toBeDisabled()
			await user.click(await openButton())
			expect(post).toHaveBeenCalledTimes(1)
		})

		it("says the month is already open on a 409 and refetches", async () => {
			const get = vi.spyOn(api, "get").mockResolvedValue([])
			vi.spyOn(api, "post").mockRejectedValue(new ApiError("exists", 409))
			const user = setup()
			await openAndConfirm(user)
			await vi.waitFor(() =>
				expect(toast.info).toHaveBeenCalledWith(
					"November 2026 is already open.",
					expect.anything()
				)
			)
			await vi.waitFor(() =>
				expect(
					get.mock.calls.filter(([e]) => String(e).includes("budget-periods"))
						.length
				).toBeGreaterThan(1)
			)
		})

		it("keeps the generic message for a 422, not the envelope one", async () => {
			vi.spyOn(api, "get").mockResolvedValue([])
			vi.spyOn(api, "post").mockRejectedValue(new ApiError("nope", 422))
			const user = setup()
			await openAndConfirm(user)
			await vi.waitFor(() =>
				expect(toast.error).toHaveBeenCalledWith(
					"Something went wrong. Try again.",
					expect.anything()
				)
			)
		})

		it("shows the generic message on other failures and allows a retry", async () => {
			vi.spyOn(api, "get").mockResolvedValue([])
			vi.spyOn(api, "post").mockRejectedValue(new ApiError("boom", 500))
			const user = setup()
			await openAndConfirm(user)
			await vi.waitFor(() =>
				expect(toast.error).toHaveBeenCalledWith(
					"Something went wrong. Try again.",
					expect.anything()
				)
			)
			expect(await openButton()).toBeEnabled()
		})
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

	it("adds an income from the panel and brings the panel back (M-20)", async () => {
		open()
		const post = vi.spyOn(api, "post").mockResolvedValue({ id: "i2" } as never)
		const user = setup()
		await user.click(await screen.findByRole("button", { name: /View all/ }))
		await user.click(await screen.findByRole("button", { name: "Add income" }))

		const form = await screen.findByRole("dialog", { name: "Add income" })
		expect(screen.queryByText("Pay day")).toBeNull()
		await user.type(within(form).getByLabelText("Description"), "Gift")
		await user.type(within(form).getByLabelText("Amount"), "5000")
		await user.click(within(form).getByRole("button", { name: "Save" }))

		await vi.waitFor(() =>
			expect(post).toHaveBeenCalledWith(
				"incomes",
				expect.objectContaining({
					budgetPeriodId: "2026-11",
					description: "Gift",
					amount: 50
				})
			)
		)
		expect(await screen.findByRole("dialog", { name: "Income" })).toBeVisible()
	})

	it("adds an income from the + Add menu without opening the panel", async () => {
		open()
		const user = setup()
		await screen.findByRole("region", { name: "Month summary" })

		await user.click(screen.getByRole("button", { name: "Add" }))
		await user.click(await screen.findByRole("menuitem", { name: /Income/ }))

		expect(
			await screen.findByRole("dialog", { name: "Add income" })
		).toBeVisible()
		await user.click(screen.getByRole("button", { name: "Cancel" }))
		await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
	})

	it("edits an income from its menu with the form prefilled (M-21)", async () => {
		open()
		const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never)
		const user = setup()
		await user.click(await screen.findByRole("button", { name: /View all/ }))
		await user.click(
			await screen.findByRole("button", { name: "Actions for Pay day" })
		)
		await user.click(await screen.findByRole("menuitem", { name: "Edit" }))

		const form = await screen.findByRole("dialog", { name: "Edit income" })
		expect(within(form).getByLabelText("Description")).toHaveValue("Pay day")
		await user.clear(within(form).getByLabelText("Description"))
		await user.type(within(form).getByLabelText("Description"), "Pay")
		await user.click(within(form).getByRole("button", { name: "Save" }))

		await vi.waitFor(() =>
			expect(patch).toHaveBeenCalledWith("incomes/i1", { description: "Pay" })
		)
	})

	it("asks before deleting an income, naming it (M-21)", async () => {
		open()
		const del = vi.spyOn(api, "delete").mockResolvedValue(undefined as never)
		const user = setup()
		await user.click(await screen.findByRole("button", { name: /View all/ }))
		await user.click(
			await screen.findByRole("button", { name: "Actions for Pay day" })
		)
		await user.click(await screen.findByRole("menuitem", { name: "Delete" }))

		expect(
			await screen.findByText(
				"Are you sure you want to delete the income Pay day?"
			)
		).toBeVisible()
		expect(del).not.toHaveBeenCalled()
		await user.click(screen.getByRole("button", { name: "Delete" }))

		await vi.waitFor(() => expect(del).toHaveBeenCalledWith("incomes/i1"))
		await vi.waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Pay day deleted")
		)
	})

	it("toasts when deleting an income fails", async () => {
		open()
		vi.spyOn(api, "delete").mockRejectedValue(new ApiError("boom", 500))
		const user = setup()
		await user.click(await screen.findByRole("button", { name: /View all/ }))
		await user.click(
			await screen.findByRole("button", { name: "Actions for Pay day" })
		)
		await user.click(await screen.findByRole("menuitem", { name: "Delete" }))
		await user.click(await screen.findByRole("button", { name: "Delete" }))

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Couldn't delete the income. Try again.",
				expect.anything()
			)
		)
	})

	it("ignores a save that finishes after the month changed", async () => {
		open()
		let finishSave: (value: unknown) => void = () => {}
		vi.spyOn(api, "post").mockReturnValue(
			new Promise((resolve) => {
				finishSave = resolve
			}) as never
		)
		const { wrapper } = createQueryWrapper()
		const { rerender } = render(<MonthScreen />, { wrapper })
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
		const addIncome = async () => {
			await user.click(await screen.findByRole("button", { name: "Add" }))
			await user.click(await screen.findByRole("menuitem", { name: /Income/ }))
			return screen.findByRole("dialog", { name: "Add income" })
		}

		// A save starts in November and is still waiting for the server
		const first = await addIncome()
		await user.type(within(first).getByLabelText("Description"), "Gift")
		await user.type(within(first).getByLabelText("Amount"), "5000")
		await user.click(within(first).getByRole("button", { name: "Save" }))

		// The user moves on to October and starts another income there
		nav.search = "period=2026-10"
		rerender(<MonthScreen />)
		await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
		const second = await addIncome()
		await user.type(within(second).getByLabelText("Description"), "Keep me")

		// November's save finishes: it must not close October's form
		await act(async () => finishSave({ id: "i2" }))
		expect(screen.getByRole("dialog", { name: "Add income" })).toBeVisible()
		expect(screen.getByLabelText("Description")).toHaveValue("Keep me")
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

	it("keeps the page when Edit replaces the details of an expense on another page", async () => {
		open(
			"",
			hydro,
			[expenseIn("x2", "2026-11", "Water bill")],
			[expenseIn("x3", "2026-11", "Gas bill")]
		)
		const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never)
		const user = setup()
		await user.click(await screen.findByRole("button", { name: "Hydro bill" }))
		await screen.findByRole("dialog")
		const params = () => new URLSearchParams(nav.search)
		await user.click(screen.getByRole("button", { name: "Next expense" }))
		await vi.waitFor(() => expect(params().get("expense")).toBe("x2"))
		const next = screen.getByRole("button", { name: "Next expense" })
		await vi.waitFor(() => expect(next).toBeEnabled())
		await user.click(next)
		await vi.waitFor(() => expect(params().get("expense")).toBe("x3"))
		expect(params().get("page")).toBe("2")

		await user.click(screen.getByRole("button", { name: "Edit" }))

		const form = await screen.findByRole("dialog", { name: "Edit expense" })
		// The details close without going back in history, which would land on page 1
		expect(params().get("expense")).toBeNull()
		expect(params().get("page")).toBe("2")
		const description = within(form).getByLabelText("Description")
		expect(description).toHaveValue("Gas bill")
		await user.type(description, " 2")
		await user.click(within(form).getByRole("button", { name: "Save" }))
		await vi.waitFor(() =>
			expect(patch).toHaveBeenCalledWith("expenses/x3", {
				description: "Gas bill 2"
			})
		)
		await vi.waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: "Edit expense" })
			).not.toBeInTheDocument()
		)
		expect(params().get("page")).toBe("2")
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

	it("edits a row from its menu and saves only the change", async () => {
		const patch = open("", {})
		const user = setup()
		await user.click(
			await screen.findByRole("button", { name: "Actions for Hydro bill" })
		)
		await user.click(await screen.findByRole("menuitem", { name: "Edit" }))
		const dialog = await screen.findByRole("dialog", { name: "Edit expense" })
		const description = within(dialog).getByLabelText("Description")
		expect(description).toHaveValue("Hydro bill")
		await user.type(description, " 2")
		await user.click(within(dialog).getByRole("button", { name: "Save" }))
		await vi.waitFor(() =>
			expect(patch).toHaveBeenCalledWith(`expenses/${ID}`, {
				description: "Hydro bill 2"
			})
		)
		await vi.waitFor(
			() =>
				expect(
					screen.queryByRole("dialog", { name: "Edit expense" })
				).not.toBeInTheDocument(),
			{ timeout: 3000 }
		)
	})

	it("edits from the details panel, replacing it with the form", async () => {
		open("", {})
		const user = setup()
		await user.click(await screen.findByRole("button", { name: "Hydro bill" }))
		await user.click(await screen.findByRole("button", { name: "Edit" }))
		expect(
			await screen.findByRole("dialog", { name: "Edit expense" })
		).toBeVisible()
		expect(nav.search).not.toContain("expense=")
	})

	it("edits in a past month too", async () => {
		open("period=2026-10", { budgetPeriodId: "2026-10" })
		const user = setup()
		await user.click(
			await screen.findByRole("button", { name: "Actions for Hydro bill" })
		)
		await user.click(await screen.findByRole("menuitem", { name: "Edit" }))
		expect(
			await screen.findByRole("dialog", { name: "Edit expense" })
		).toHaveTextContent("October 2026")
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

describe("MonthScreen delete", () => {
	const ID = "11111111-1111-4111-8111-111111111111"
	const OTHER = "22222222-2222-4222-8222-222222222222"
	const row = (id: string, description: string, patch = {}) => ({
		id,
		budgetPeriodId: "2026-11",
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
		deletedAt: null,
		...patch
	})

	// The server drops the row on DELETE, so the refetch returns what is left
	const open = (
		search: string,
		rows: ReturnType<typeof row>[],
		failure?: ApiError
	) => {
		nav.search = search
		let left = rows
		vi.spyOn(api, "getPage").mockImplementation((async () => ({
			data: left,
			total: left.length,
			totalAmount: 120,
			page: 1,
			limit: 10
		})) as never)
		vi.spyOn(api, "get").mockImplementation(((endpoint: string) => {
			const found = left.find((r) => endpoint === `expenses/${r.id}`)
			if (found) return Promise.resolve(found)
			return Promise.resolve(
				endpoint.includes("budget-periods")
					? [make(2026, 11), make(2026, 10)]
					: []
			)
		}) as never)
		return vi.spyOn(api, "delete").mockImplementation((async (
			endpoint: string
		) => {
			if (failure) throw failure
			left = left.filter((r) => endpoint !== `expenses/${r.id}`)
		}) as never)
	}

	const askFromMenu = async (
		user: ReturnType<typeof setup>,
		name = "Hydro bill"
	) => {
		await user.click(
			await screen.findByRole("button", { name: `Actions for ${name}` })
		)
		await user.click(await screen.findByRole("menuitem", { name: "Delete" }))
		return screen.findByRole("dialog", { name: "Delete expense" })
	}

	it("confirms from the row menu, then deletes only that row", async () => {
		const del = open("", [row(ID, "Hydro bill"), row(OTHER, "Rent")])
		const user = setup()
		const dialog = await askFromMenu(user)
		expect(dialog).toHaveTextContent(
			"Are you sure you want to delete the one-time expense Hydro bill?"
		)
		expect(del).not.toHaveBeenCalled()
		await user.click(within(dialog).getByRole("button", { name: "Delete" }))
		await vi.waitFor(() => expect(del).toHaveBeenCalledWith(`expenses/${ID}`))
		await vi.waitFor(() =>
			expect(screen.queryByText("Hydro bill")).not.toBeInTheDocument()
		)
		expect(screen.getByText("Rent")).toBeInTheDocument()
		expect(toast.success).toHaveBeenCalledWith("Hydro bill deleted")
		expect(
			screen.queryByRole("dialog", { name: "Delete expense" })
		).not.toBeInTheDocument()
	})

	it("sends nothing when cancelled", async () => {
		const del = open("", [row(ID, "Hydro bill")])
		const user = setup()
		const dialog = await askFromMenu(user)
		await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
		expect(del).not.toHaveBeenCalled()
		expect(screen.getByText("Hydro bill")).toBeInTheDocument()
	})

	it("deletes from the details panel and clears the address", async () => {
		const del = open(`expense=${ID}`, [row(ID, "Hydro bill")])
		const user = setup()
		const panel = await screen.findByRole("dialog", { name: "Hydro bill" })
		await user.click(within(panel).getByRole("button", { name: "Delete" }))
		const dialog = await screen.findByRole("dialog", { name: "Delete expense" })
		await user.click(within(dialog).getByRole("button", { name: "Delete" }))
		await vi.waitFor(() => expect(del).toHaveBeenCalledWith(`expenses/${ID}`))
		await vi.waitFor(() => expect(nav.search).not.toContain("expense="))
		expect(toast.error).not.toHaveBeenCalled()
	})

	it("names an installment in the confirmation", async () => {
		open("", [
			row(ID, "Car finance", {
				installmentNumber: 2,
				installment: {
					id: "g1",
					totalInstallments: 4,
					paymentIntervalDays: 30,
					firstPurchasedAt: "2026-10-01"
				}
			})
		])
		const user = setup()
		const dialog = await askFromMenu(user, "Car finance")
		expect(dialog).toHaveTextContent(
			"Are you sure you want to delete the installment Car finance?"
		)
	})

	it("names a recurring expense in the confirmation", async () => {
		open("", [
			row(ID, "Hydro bill", { recurringExpenseId: "r1", monthsRunning: 3 })
		])
		const user = setup()
		const dialog = await askFromMenu(user)
		expect(dialog).toHaveTextContent(
			"Are you sure you want to delete the recurring expense Hydro bill?"
		)
	})

	it("deletes in a past month too", async () => {
		const del = open("period=2026-10", [
			row(ID, "Hydro bill", { budgetPeriodId: "2026-10" })
		])
		const user = setup()
		const dialog = await askFromMenu(user)
		await user.click(within(dialog).getByRole("button", { name: "Delete" }))
		await vi.waitFor(() => expect(del).toHaveBeenCalledWith(`expenses/${ID}`))
	})

	it("keeps the row and shows a toast when the delete fails", async () => {
		open("", [row(ID, "Hydro bill")], new ApiError("boom", 500))
		const user = setup()
		const dialog = await askFromMenu(user)
		await user.click(within(dialog).getByRole("button", { name: "Delete" }))
		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Couldn't delete the expense. Try again.",
				expect.anything()
			)
		)
		expect(toast.success).not.toHaveBeenCalled()
		expect(screen.getByText("Hydro bill")).toBeInTheDocument()
		expect(
			screen.queryByRole("dialog", { name: "Delete expense" })
		).not.toBeInTheDocument()
	})

	it("treats a 404 as already deleted and refreshes the list", async () => {
		open("", [row(ID, "Hydro bill")], new ApiError("gone", 404))
		const user = setup()
		const dialog = await askFromMenu(user)
		const loads = vi.mocked(api.getPage).mock.calls.length
		await user.click(within(dialog).getByRole("button", { name: "Delete" }))
		await vi.waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: "Delete expense" })
			).not.toBeInTheDocument()
		)
		await vi.waitFor(() =>
			expect(vi.mocked(api.getPage).mock.calls.length).toBeGreaterThan(loads)
		)
		expect(toast.error).not.toHaveBeenCalled()
		expect(toast.success).not.toHaveBeenCalled()
	})
	it("falls back to the previous page when the last row of the last page goes", async () => {
		const rows = Array.from({ length: 11 }, (_, index) =>
			row(`3333333${index}-3333-4333-8333-333333333333`, `Bill ${index + 1}`)
		)
		let left = rows
		nav.search = "page=2"
		vi.spyOn(api, "getPage").mockImplementation((async (
			_endpoint: string,
			params?: { page?: number }
		) => {
			const page = Number(params?.page ?? 1)
			return {
				data: left.slice((page - 1) * 10, page * 10),
				total: left.length,
				totalAmount: 120,
				page,
				limit: 10
			}
		}) as never)
		vi.spyOn(api, "get").mockImplementation(((endpoint: string) =>
			Promise.resolve(
				endpoint.includes("budget-periods")
					? [make(2026, 11), make(2026, 10)]
					: []
			)) as never)
		const del = vi.spyOn(api, "delete").mockImplementation((async (
			endpoint: string
		) => {
			left = left.filter((r) => endpoint !== `expenses/${r.id}`)
		}) as never)
		const user = setup()
		const dialog = await askFromMenu(user, "Bill 11")
		await user.click(within(dialog).getByRole("button", { name: "Delete" }))
		await vi.waitFor(() => expect(del).toHaveBeenCalledOnce())
		expect(await screen.findByText("Bill 1")).toBeInTheDocument()
		expect(screen.queryByText("Bill 11")).not.toBeInTheDocument()
		expect(nav.search).not.toContain("page=2")
	})
	it("brings the details back when deleting from them fails", async () => {
		open(`expense=${ID}`, [row(ID, "Hydro bill")], new ApiError("boom", 500))
		const user = setup()
		const panel = await screen.findByRole("dialog", { name: "Hydro bill" })
		await user.click(within(panel).getByRole("button", { name: "Delete" }))
		const dialog = await screen.findByRole("dialog", { name: "Delete expense" })
		await user.click(within(dialog).getByRole("button", { name: "Delete" }))
		await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())
		await vi.waitFor(() => expect(nav.search).toContain(`expense=${ID}`))
	})
	it("doesn't reopen the details on the old month when a delete fails after the month changed", async () => {
		open(`expense=${ID}`, [row(ID, "Hydro bill")])
		let fail: (error: ApiError) => void = () => {}
		vi.mocked(api.delete).mockImplementation(
			() => new Promise((_resolve, reject) => (fail = reject)) as never
		)
		const user = setup()
		const panel = await screen.findByRole("dialog", { name: "Hydro bill" })
		await user.click(within(panel).getByRole("button", { name: "Delete" }))
		const dialog = await screen.findByRole("dialog", { name: "Delete expense" })
		await user.click(within(dialog).getByRole("button", { name: "Delete" }))
		await vi.waitFor(() => expect(api.delete).toHaveBeenCalled())
		// Another month is shown while the request is still pending
		act(() => {
			nav.search = "period=2026-10"
			notify()
		})
		await act(async () => fail(new ApiError("boom", 500)))
		await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())
		expect(nav.search).toBe("period=2026-10")
	})
})

describe("MonthScreen envelopes", () => {
	const GROCERY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
	const FUEL_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
	const categories = [
		{ id: "c-grocery", name: "Grocery", hasBudgetEnvelope: true },
		{ id: "c-fuel", name: "Fuel", hasBudgetEnvelope: true },
		{ id: "c-parking", name: "Parking", hasBudgetEnvelope: true },
		{ id: "c-rent", name: "Rent", hasBudgetEnvelope: false }
	]
	const envelope = (
		id: string,
		categoryId: string,
		allocatedAmount: number,
		periodId = "2026-11"
	) => ({
		id,
		budgetPeriodId: periodId,
		categoryId,
		allocatedAmount,
		spentAmount: 100,
		spendUpdatedAt: "2026-11-02T10:00:00.000Z",
		createdAt: "",
		updatedAt: "",
		deletedAt: null
	})

	// A small server: the lists change when the app POSTs, PATCHes or DELETEs
	const open = (
		search: string,
		initial = [
			envelope(GROCERY_ID, "c-grocery", 600),
			envelope(FUEL_ID, "c-fuel", 200)
		]
	) => {
		nav.search = search
		let list = initial
		vi.spyOn(api, "getPage").mockResolvedValue({
			data: [],
			total: 0,
			totalAmount: 0,
			page: 1,
			limit: 10
		} as never)
		vi.spyOn(api, "get").mockImplementation(((endpoint: string) => {
			if (endpoint.includes("budget-periods"))
				return Promise.resolve([make(2026, 11), make(2026, 10)])
			if (endpoint.startsWith("categories")) return Promise.resolve(categories)
			if (endpoint.startsWith("budget-envelopes?")) {
				const period = new URLSearchParams(endpoint.split("?")[1]).get(
					"budgetPeriodId"
				)
				return Promise.resolve(list.filter((e) => e.budgetPeriodId === period))
			}
			return Promise.resolve([])
		}) as never)
		return {
			post: vi.spyOn(api, "post").mockImplementation((async (
				_endpoint: string,
				body: { categoryId: string; allocatedAmount: number }
			) => {
				const created = envelope(
					"cccccccc-cccc-4ccc-8ccc-cccccccccccc",
					body.categoryId,
					body.allocatedAmount
				)
				list = [...list, created]
				return created
			}) as never),
			patch: vi.spyOn(api, "patch").mockImplementation((async (
				endpoint: string,
				body: { allocatedAmount: number }
			) => {
				list = list.map((e) =>
					endpoint === `budget-envelopes/${e.id}` ? { ...e, ...body } : e
				)
				return {}
			}) as never),
			del: vi.spyOn(api, "delete").mockImplementation((async (
				endpoint: string
			) => {
				list = list.filter((e) => endpoint !== `budget-envelopes/${e.id}`)
			}) as never)
		}
	}

	it("adds an envelope from + Add, offering only categories without one (M-23)", async () => {
		const { post } = open("")
		const user = setup()
		await screen.findByRole("region", { name: "Month summary" })

		await user.click(screen.getByRole("button", { name: "Add" }))
		await user.click(await screen.findByRole("menuitem", { name: /Category/ }))
		const form = await screen.findByRole("dialog", { name: "Add envelope" })
		await user.click(within(form).getByRole("combobox", { name: "Category" }))
		expect(
			(await screen.findAllByRole("option")).map((o) => o.textContent)
		).toEqual(["Parking"])
		await user.click(screen.getByRole("option", { name: "Parking" }))
		await user.type(within(form).getByLabelText("Budget"), "2000")
		await user.click(within(form).getByRole("button", { name: "Save" }))

		await vi.waitFor(() =>
			expect(post).toHaveBeenCalledWith("budget-envelopes", {
				budgetPeriodId: "2026-11",
				categoryId: "c-parking",
				allocatedAmount: 20
			})
		)
		expect(await screen.findByText("Parking")).toBeInTheDocument()
		expect(toast.success).toHaveBeenCalledWith(
			"Parking envelope added to November 2026."
		)
	})

	it("disables the Envelope entry when every envelope category has one", async () => {
		open("", [
			envelope(GROCERY_ID, "c-grocery", 600),
			envelope(FUEL_ID, "c-fuel", 200),
			envelope("dddddddd-dddd-4ddd-8ddd-dddddddddddd", "c-parking", 20)
		])
		const user = setup()
		await screen.findByText("Parking")

		await user.click(screen.getByRole("button", { name: "Add" }))
		const entry = await screen.findByRole("menuitem", { name: /Category/ })
		await vi.waitFor(() =>
			expect(entry).toHaveAttribute("aria-disabled", "true")
		)
		expect(entry).toHaveTextContent(
			"Every category already has a budget this month."
		)
	})

	it("offers the Envelope entry only in months where envelopes can change (M-25)", async () => {
		open("period=2026-10")
		const user = setup()
		await screen.findByRole("region", { name: "Month summary" })

		await user.click(screen.getByRole("button", { name: "Add" }))
		expect(
			await screen.findByRole("menuitem", { name: /Expense/ })
		).toBeInTheDocument()
		expect(screen.queryByRole("menuitem", { name: /Category/ })).toBeNull()
	})

	it("edits only the budget from the details and shows the details again (M-22)", async () => {
		const { patch } = open(`envelope=${GROCERY_ID}`)
		const user = setup()
		const details = await screen.findByRole("dialog", { name: "Grocery" })
		await user.click(
			within(details).getByRole("button", { name: "Edit budget" })
		)

		const form = await screen.findByRole("dialog", { name: "Edit budget" })
		expect(new URLSearchParams(nav.search).get("envelope")).toBeNull()
		const budget = within(form).getByLabelText("Budget")
		expect(budget).toHaveValue("600.00")
		await user.clear(budget)
		await user.type(budget, "70000")
		await user.click(within(form).getByRole("button", { name: "Save" }))

		await vi.waitFor(() =>
			expect(patch).toHaveBeenCalledWith(`budget-envelopes/${GROCERY_ID}`, {
				allocatedAmount: 700
			})
		)
		const back = await screen.findByRole("dialog", { name: "Grocery" })
		expect(new URLSearchParams(nav.search).get("envelope")).toBe(GROCERY_ID)
		await vi.waitFor(() => expect(back).toHaveTextContent("$700.00"))
	})

	it("confirms, then deletes the envelope and clears the address (M-24)", async () => {
		const { del } = open(`envelope=${GROCERY_ID}`)
		const user = setup()
		const details = await screen.findByRole("dialog", { name: "Grocery" })
		await user.click(within(details).getByRole("button", { name: "Delete" }))

		const confirm = await screen.findByRole("dialog", {
			name: "Delete envelope"
		})
		expect(confirm).toHaveTextContent(
			"Are you sure you want to delete the Grocery envelope?"
		)
		expect(del).not.toHaveBeenCalled()
		await user.click(within(confirm).getByRole("button", { name: "Delete" }))

		await vi.waitFor(() =>
			expect(del).toHaveBeenCalledWith(`budget-envelopes/${GROCERY_ID}`)
		)
		expect(toast.success).toHaveBeenCalledWith("Grocery envelope deleted")
		await vi.waitFor(() =>
			expect(new URLSearchParams(nav.search).get("envelope")).toBeNull()
		)
		await vi.waitFor(() => expect(screen.queryByText("Grocery")).toBeNull())
		expect(screen.getByText("Fuel")).toBeInTheDocument()
	})

	it("sends nothing when the delete is cancelled", async () => {
		const { del } = open(`envelope=${GROCERY_ID}`)
		const user = setup()
		const details = await screen.findByRole("dialog", { name: "Grocery" })
		await user.click(within(details).getByRole("button", { name: "Delete" }))
		const confirm = await screen.findByRole("dialog", {
			name: "Delete envelope"
		})
		await user.click(within(confirm).getByRole("button", { name: "Cancel" }))
		expect(del).not.toHaveBeenCalled()
	})

	it("brings the details back and toasts when the delete fails", async () => {
		const { del } = open(`envelope=${GROCERY_ID}`)
		del.mockRejectedValue(new ApiError("boom", 500))
		const user = setup()
		const details = await screen.findByRole("dialog", { name: "Grocery" })
		await user.click(within(details).getByRole("button", { name: "Delete" }))
		const confirm = await screen.findByRole("dialog", {
			name: "Delete envelope"
		})
		await user.click(within(confirm).getByRole("button", { name: "Delete" }))

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Couldn't delete the envelope. Try again.",
				expect.anything()
			)
		)
		await vi.waitFor(() =>
			expect(new URLSearchParams(nav.search).get("envelope")).toBe(GROCERY_ID)
		)
	})

	it("treats a 404 on delete as already deleted", async () => {
		const { del } = open(`envelope=${GROCERY_ID}`)
		// Someone else deleted it: the server no longer lists it once the app asks again
		const read = vi.mocked(api.get).getMockImplementation()
		let gone = false
		vi.mocked(api.get).mockImplementation((async (endpoint: string) => {
			const result = (await read?.(endpoint)) as { id: string }[]
			return gone && endpoint.startsWith("budget-envelopes?")
				? result.filter((e) => e.id !== GROCERY_ID)
				: result
		}) as never)
		del.mockImplementation((async () => {
			gone = true
			throw new ApiError("gone", 404)
		}) as never)
		const user = setup()
		const details = await screen.findByRole("dialog", { name: "Grocery" })
		await user.click(within(details).getByRole("button", { name: "Delete" }))
		const confirm = await screen.findByRole("dialog", {
			name: "Delete envelope"
		})
		await user.click(within(confirm).getByRole("button", { name: "Delete" }))

		await vi.waitFor(() => expect(del).toHaveBeenCalled())
		// The list is refreshed: the tile and the confirmation are gone, the rest stays
		await vi.waitFor(() => expect(screen.queryByText("Grocery")).toBeNull())
		await vi.waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: "Delete envelope" })
			).toBeNull()
		)
		expect(screen.getByText("Fuel")).toBeInTheDocument()
		expect(toast.error).not.toHaveBeenCalled()
		expect(toast.success).not.toHaveBeenCalled()
	})

	it("says the month is closed, not to retry, when the delete is rejected with 422", async () => {
		const { del } = open(`envelope=${GROCERY_ID}`)
		del.mockRejectedValue(new ApiError("past", 422))
		const user = setup()
		const details = await screen.findByRole("dialog", { name: "Grocery" })
		await user.click(within(details).getByRole("button", { name: "Delete" }))
		const confirm = await screen.findByRole("dialog", {
			name: "Delete envelope"
		})
		const envelopeReads = () =>
			vi
				.mocked(api.get)
				.mock.calls.filter(([endpoint]) =>
					String(endpoint).startsWith("budget-envelopes?")
				).length
		const before = envelopeReads()
		await user.click(within(confirm).getByRole("button", { name: "Delete" }))

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Envelopes of past months can't be changed.",
				expect.anything()
			)
		)
		// The envelopes are read again, and the details come back
		await vi.waitFor(() => expect(envelopeReads()).toBeGreaterThan(before))
		await vi.waitFor(() =>
			expect(new URLSearchParams(nav.search).get("envelope")).toBe(GROCERY_ID)
		)
	})

	it("hides Edit budget in a past month", async () => {
		open(`period=2026-10&envelope=${GROCERY_ID}`, [
			envelope(GROCERY_ID, "c-grocery", 600, "2026-10")
		])
		setup()
		expect(await screen.findByRole("dialog", { name: "Grocery" })).toBeVisible()
		expect(screen.queryByRole("button", { name: "Edit budget" })).toBeNull()
	})
})

describe("MonthScreen delete month", () => {
	const row = {
		id: "11111111-1111-4111-8111-111111111111",
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
		deletedAt: null
	}
	const arrange = (empty: boolean) => {
		vi.spyOn(api, "get").mockImplementation((async (endpoint: string) => {
			if (endpoint.includes("budget-periods")) {
				return [make(2026, 11), make(2026, 3), make(2025, 12)]
			}
			return []
		}) as never)
		vi.spyOn(api, "getPage").mockResolvedValue({
			data: empty ? [] : [row],
			total: empty ? 0 : 1,
			totalAmount: empty ? 0 : 120,
			page: 1,
			limit: 10
		} as never)
	}
	const openMenu = async (user: ReturnType<typeof setup>) => {
		await user.click(
			await screen.findByRole("button", { name: "Month actions" })
		)
		return screen.findByRole("menuitem", { name: /Delete month/ })
	}

	it("disables Delete month with the reason while the month holds rows", async () => {
		arrange(false)
		const user = setup()
		await screen.findByText("Hydro bill")
		const item = await openMenu(user)
		await vi.waitFor(() =>
			expect(item).toHaveTextContent(
				"Remove this month's expenses, incomes and envelopes first."
			)
		)
		expect(item).toHaveAttribute("aria-disabled", "true")
	})

	it("confirms, deletes the period and lands on the previous opened month", async () => {
		arrange(true)
		const del = vi.spyOn(api, "delete").mockResolvedValue(undefined as never)
		const user = setup()
		const item = await openMenu(user)
		await vi.waitFor(() =>
			expect(item).not.toHaveAttribute("aria-disabled", "true")
		)
		await user.click(item)
		const dialog = await screen.findByRole("dialog", { name: "Delete month" })
		expect(dialog).toHaveTextContent(
			"Are you sure you want to delete November 2026?"
		)
		expect(del).not.toHaveBeenCalled()
		await user.click(within(dialog).getByRole("button", { name: "Delete" }))
		await vi.waitFor(() =>
			expect(del).toHaveBeenCalledWith("budget-periods/2026-11")
		)
		await vi.waitFor(() => expect(nav.search).toContain("period=2026-03"))
		expect(nav.history).toEqual([])
		expect(toast.success).toHaveBeenCalledWith("November 2026 deleted")
	})

	it("keeps the month and says why when the server answers 409", async () => {
		arrange(true)
		vi.spyOn(api, "delete").mockRejectedValue(new ApiError("not empty", 409))
		const user = setup()
		const item = await openMenu(user)
		await vi.waitFor(() =>
			expect(item).not.toHaveAttribute("aria-disabled", "true")
		)
		await user.click(item)
		const dialog = await screen.findByRole("dialog", { name: "Delete month" })
		await user.click(within(dialog).getByRole("button", { name: "Delete" }))
		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Remove this month's expenses, incomes and envelopes first.",
				expect.anything()
			)
		)
		expect(nav.search).toBe("")
	})

	it("shows the generic failure toast for other errors", async () => {
		arrange(true)
		vi.spyOn(api, "delete").mockRejectedValue(new ApiError("boom", 500))
		const user = setup()
		const item = await openMenu(user)
		await vi.waitFor(() =>
			expect(item).not.toHaveAttribute("aria-disabled", "true")
		)
		await user.click(item)
		const dialog = await screen.findByRole("dialog", { name: "Delete month" })
		await user.click(within(dialog).getByRole("button", { name: "Delete" }))
		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Couldn't delete the month. Try again.",
				expect.anything()
			)
		)
	})

	it("treats a 404 as already deleted and leaves the month", async () => {
		arrange(true)
		vi.spyOn(api, "delete").mockRejectedValue(new ApiError("gone", 404))
		const user = setup()
		const item = await openMenu(user)
		await vi.waitFor(() =>
			expect(item).not.toHaveAttribute("aria-disabled", "true")
		)
		await user.click(item)
		const dialog = await screen.findByRole("dialog", { name: "Delete month" })
		await user.click(within(dialog).getByRole("button", { name: "Delete" }))
		await vi.waitFor(() => expect(nav.search).toContain("period=2026-03"))
		expect(toast.error).not.toHaveBeenCalled()
	})

	it("lands on a month opened elsewhere while the delete ran", async () => {
		let periods = [make(2026, 11), make(2026, 3), make(2025, 12)]
		vi.spyOn(api, "get").mockImplementation((async (endpoint: string) =>
			endpoint.includes("budget-periods") ? periods : []) as never)
		vi.spyOn(api, "getPage").mockResolvedValue({
			data: [],
			total: 0,
			totalAmount: 0,
			page: 1,
			limit: 10
		} as never)
		vi.spyOn(api, "delete").mockImplementation((async () => {
			periods = [make(2026, 10), make(2026, 3), make(2025, 12)]
		}) as never)
		const user = setup()
		const item = await openMenu(user)
		await vi.waitFor(() =>
			expect(item).not.toHaveAttribute("aria-disabled", "true")
		)
		await user.click(item)
		const dialog = await screen.findByRole("dialog", { name: "Delete month" })
		await user.click(within(dialog).getByRole("button", { name: "Delete" }))
		await vi.waitFor(() => expect(nav.search).toContain("period=2026-10"))
	})

	it("keeps Delete month disabled while the previous month's expenses stand in", async () => {
		let release: (page: unknown) => void = () => {}
		vi.spyOn(api, "get").mockImplementation((async (endpoint: string) =>
			endpoint.includes("budget-periods")
				? [make(2026, 11), make(2026, 10)]
				: []) as never)
		vi.spyOn(api, "getPage").mockImplementation((async (
			_endpoint: string,
			params: { budgetPeriodId?: string }
		) =>
			params.budgetPeriodId === "2026-10"
				? { data: [], total: 0, totalAmount: 0, page: 1, limit: 10 }
				: new Promise((resolve) => {
						release = resolve
					})) as never)
		nav.search = "period=2026-10"
		const user = setup()
		const item = await openMenu(user)
		await vi.waitFor(() =>
			expect(item).not.toHaveAttribute("aria-disabled", "true")
		)
		await user.keyboard("{Escape}")
		await user.click(screen.getByRole("button", { name: /Next month/ }))
		const again = await openMenu(user)
		expect(again).toHaveAttribute("aria-disabled", "true")
		release({ data: [], total: 0, totalAmount: 0, page: 1, limit: 10 })
	})
})
