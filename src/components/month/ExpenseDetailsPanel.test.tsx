// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import type { Expense, ExpensePage } from "@/types"
import { ExpenseDetailsPanel } from "./ExpenseDetailsPanel"

const nav = vi.hoisted(() => ({ search: "period=2026-11" }))
vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(nav.search),
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}))

const phone = vi.hoisted(() => ({ value: false }))
vi.mock("@/hooks/use-media-query", () => ({
	PHONE_QUERY: "phone",
	useMediaQuery: () => phone.value
}))

const expense = (id: number, patch: Partial<Expense> = {}): Expense => ({
	id: String(id),
	budgetPeriodId: "p1",
	recurringExpenseId: null,
	description: `Expense ${id}`,
	installmentNumber: null,
	purchasedAt: "2026-11-01",
	dueAt: "2026-11-28",
	paidAt: null,
	amount: 1450,
	category: { id: "c1", name: "Housing" },
	paymentType: { id: "t1", name: "Credit Card" },
	bank: { id: "b1", name: "RBC" },
	store: { id: "s1", name: "Costco" },
	installment: null,
	monthsRunning: null,
	createdAt: "",
	updatedAt: "",
	deletedAt: null,
	...patch
})

const page = (data: Expense[]) =>
	({
		data,
		total: data.length,
		totalAmount: 0,
		page: 1,
		limit: 10
	}) as ExpensePage

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] })
	vi.setSystemTime(new Date("2026-11-15T12:00:00Z"))
	phone.value = false
	nav.search = "period=2026-11"
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

function setup(
	list: Expense[],
	props: Partial<Parameters<typeof ExpenseDetailsPanel>[0]> = {}
) {
	vi.spyOn(api, "getPage").mockResolvedValue(page(list))
	const get = vi.spyOn(api, "get").mockResolvedValue({
		id: "r1",
		startedAt: "2025-03-01"
	} as never)
	const onClose = vi.fn()
	const { wrapper } = createQueryWrapper()
	render(
		<ExpenseDetailsPanel
			onClose={onClose}
			periodId="p1"
			expenseId={list[0].id}
			canEdit
			{...props}
		/>,
		{ wrapper }
	)
	return {
		get,
		onClose,
		user: userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
	}
}

const dialog = async () => within(await screen.findByRole("dialog"))

const openTab = async (panel: ReturnType<typeof within>, name: string) =>
	userEvent.click(panel.getByRole("tab", { name }))

describe("ExpenseDetailsPanel", () => {
	it("shows a one-time unpaid expense with every field the table leaves out", async () => {
		setup([expense(1, { description: "Rent" })])
		const panel = await dialog()
		expect(panel.getByRole("heading", { name: "Rent" })).toBeInTheDocument()
		expect(panel.getByText("$1,450.00")).toBeInTheDocument()
		expect(panel.getByText("Housing")).toBeInTheDocument()
		expect(panel.getByText("Not paid")).toBeInTheDocument()
		expect(panel.getByText("Credit Card")).toBeInTheDocument()
		expect(panel.getByText("RBC")).toBeInTheDocument()
		expect(panel.getByText("Costco")).toBeInTheDocument()
		await openTab(panel, "Dates")
		expect(panel.getByText("1 Nov 2026")).toBeInTheDocument()
		expect(panel.getByText("28 Nov 2026")).toBeInTheDocument()
		// A one-time expense has no plan or recurring bill, so those tabs are left out
		expect(panel.queryByRole("tab", { name: "Installment plan" })).toBeNull()
		expect(panel.queryByRole("tab", { name: "Recurring bill" })).toBeNull()
	})

	it("opens on the Payment tab and shows only the tabs that apply", async () => {
		setup([expense(1)])
		const panel = await dialog()
		expect(panel.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
			"Payment",
			"Dates"
		])
		expect(panel.getByRole("tab", { name: "Payment" })).toHaveAttribute(
			"aria-selected",
			"true"
		)
		expect(panel.queryByText("Purchased")).toBeNull()
	})

	it("adds the Installment plan and Recurring bill tabs for those expenses", async () => {
		setup([
			expense(1, {
				installmentNumber: 1,
				installment: {
					id: "g1",
					totalInstallments: 3,
					paymentIntervalDays: 14,
					firstPurchasedAt: "2026-11-01T00:00:00.000Z"
				}
			}),
			expense(2, { recurringExpenseId: "r1", monthsRunning: 1 })
		])
		const panel = await dialog()
		expect(panel.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
			"Payment",
			"Dates",
			"Installment plan"
		])
	})

	it("opens without any extra request for a one-time expense", async () => {
		const { get } = setup([expense(1)])
		await dialog()
		expect(get).not.toHaveBeenCalled()
	})

	it("shows dashes for missing bank, store and dates", async () => {
		setup([
			expense(1, { bank: null, store: null, purchasedAt: null, dueAt: null })
		])
		const panel = await dialog()
		// bank and store
		expect(panel.getAllByText("—")).toHaveLength(2)
		await openTab(panel, "Dates")
		// purchased, due and paid (not paid yet)
		expect(panel.getAllByText("—")).toHaveLength(3)
	})

	it("marks a paid expense and offers to mark it unpaid", async () => {
		setup([expense(1, { paidAt: "2026-11-10" })])
		const panel = await dialog()
		// The status row of the Payment tab
		expect(panel.getByText("Paid")).toBeInTheDocument()
		await openTab(panel, "Dates")
		// Now the Paid date label
		expect(panel.getByText("Paid")).toBeInTheDocument()
		expect(panel.getByText("10 Nov 2026")).toBeInTheDocument()
		expect(
			panel.getByRole("button", { name: "Mark as unpaid" })
		).toBeInTheDocument()
	})

	it("marks an unpaid expense due before today as overdue", async () => {
		setup([expense(1, { dueAt: "2026-11-10" })])
		const panel = await dialog()
		expect(panel.getByText("Overdue")).toBeInTheDocument()
		expect(
			panel.getByRole("button", { name: "Mark as paid today" })
		).toBeInTheDocument()
	})

	it("shows the plan of an installment: n of N, interval, first purchase and end date", async () => {
		setup([
			expense(1, {
				description: "Car finance",
				installmentNumber: 78,
				installment: {
					id: "g1",
					totalInstallments: 104,
					paymentIntervalDays: 14,
					firstPurchasedAt: "2023-11-10T00:00:00.000Z"
				}
			})
		])
		const panel = await dialog()
		await openTab(panel, "Installment plan")
		expect(panel.getByText("78 of 104")).toBeInTheDocument()
		expect(panel.getByText("Every 14 days")).toBeInTheDocument()
		expect(panel.getByText("10 Nov 2023")).toBeInTheDocument()
		expect(panel.getByText("22 Oct 2027")).toBeInTheDocument()
		expect(panel.queryByRole("button", { name: "View plan" })).toBeNull()
	})

	it("shows the month a recurring bill is on, when it started, and a link to Recurring", async () => {
		const { get } = setup([
			expense(1, {
				description: "Hydro",
				recurringExpenseId: "r1",
				monthsRunning: 11
			})
		])
		const panel = await dialog()
		await openTab(panel, "Recurring bill")
		expect(panel.getByText("Month 11")).toBeInTheDocument()
		expect(await panel.findByText("Mar 2025")).toBeInTheDocument()
		expect(get).toHaveBeenCalledWith("recurring-expenses/r1")
		expect(panel.getByRole("link", { name: "Recurring" })).toHaveAttribute(
			"href",
			"/recurring"
		)
	})

	it("shows a dash for the start when the bill can't be read", async () => {
		vi.spyOn(api, "get").mockRejectedValue(new Error("boom"))
		vi.spyOn(api, "getPage").mockResolvedValue(
			page([expense(1, { recurringExpenseId: "r1", monthsRunning: 2 })])
		)
		const { wrapper } = createQueryWrapper()
		render(
			<ExpenseDetailsPanel
				onClose={vi.fn()}
				periodId="p1"
				expenseId="1"
				canEdit
			/>,
			{ wrapper }
		)
		const panel = await dialog()
		await openTab(panel, "Recurring bill")
		expect(panel.getByText("Month 2")).toBeInTheDocument()
		await vi.waitFor(() => expect(panel.queryByRole("status")).toBeNull())
	})

	it("keeps the real name of a deleted lookup as given by the API", async () => {
		setup([expense(1, { category: { id: "x", name: "Old category" } })])
		expect((await dialog()).getByText("Old category")).toBeInTheDocument()
	})

	it("hides every action in a closed month", async () => {
		setup(
			[
				expense(1, {
					installmentNumber: 1,
					installment: {
						id: "g1",
						totalInstallments: 3,
						paymentIntervalDays: 30,
						firstPurchasedAt: "2026-11-01"
					}
				})
			],
			{ canEdit: false }
		)
		const panel = await dialog()
		expect(panel.queryByRole("button", { name: /Mark as/ })).toBeNull()
		expect(panel.queryByRole("button", { name: "Edit" })).toBeNull()
		expect(panel.queryByRole("button", { name: "Delete" })).toBeNull()
	})

	it("calls the action handlers", async () => {
		const onTogglePaid = vi.fn()
		const onEdit = vi.fn()
		const onDelete = vi.fn()
		const { user } = setup([expense(1)], { onTogglePaid, onEdit, onDelete })
		const panel = await dialog()
		await user.click(panel.getByRole("button", { name: "Mark as paid today" }))
		await user.click(panel.getByRole("button", { name: "Edit" }))
		await user.click(panel.getByRole("button", { name: "Delete" }))
		expect(onTogglePaid).toHaveBeenCalledWith(
			expect.objectContaining({ id: "1" })
		)
		expect(onEdit).toHaveBeenCalledOnce()
		expect(onDelete).toHaveBeenCalledOnce()
	})

	it("closes with the X button and with Escape", async () => {
		const { user, onClose } = setup([expense(1)])
		const panel = await dialog()
		await user.click(panel.getByRole("button", { name: "Close" }))
		expect(onClose).toHaveBeenCalledOnce()
		await user.keyboard("{Escape}")
		expect(onClose).toHaveBeenCalledTimes(2)
	})

	it("reads an expense that isn't on the page by id (a shared link)", async () => {
		vi.spyOn(api, "getPage").mockResolvedValue(page([expense(1)]))
		const get = vi
			.spyOn(api, "get")
			.mockResolvedValue(expense(77, { description: "Far away" }) as never)
		const { wrapper } = createQueryWrapper()
		render(
			<ExpenseDetailsPanel
				onClose={vi.fn()}
				periodId="p1"
				expenseId="77"
				canEdit
			/>,
			{ wrapper }
		)
		const panel = await dialog()
		expect(panel.getByRole("heading", { name: "Far away" })).toBeInTheDocument()
		expect(get).toHaveBeenCalledWith("expenses/77")
	})

	it("stays closed when the expense can't be found", async () => {
		vi.spyOn(api, "getPage").mockResolvedValue(page([expense(1)]))
		const get = vi
			.spyOn(api, "get")
			.mockRejectedValue(new ApiError("not found", 404))
		const { wrapper } = createQueryWrapper()
		render(
			<ExpenseDetailsPanel
				onClose={vi.fn()}
				periodId="p1"
				expenseId="gone"
				canEdit
			/>,
			{ wrapper }
		)
		await vi.waitFor(() => expect(get).toHaveBeenCalledWith("expenses/gone"))
		expect(screen.queryByRole("dialog")).toBeNull()
	})

	describe("previous and next", () => {
		const list = [expense(1), expense(2), expense(3)]

		it("steps to the neighbours in the order of the page", async () => {
			const onNavigate = vi.fn()
			const { user } = setup(list, { expenseId: "2", onNavigate })
			const panel = await dialog()
			await user.click(panel.getByRole("button", { name: "Next expense" }))
			expect(onNavigate).toHaveBeenLastCalledWith(
				expect.objectContaining({ id: "3" }),
				1
			)
			await user.click(panel.getByRole("button", { name: "Previous expense" }))
			expect(onNavigate).toHaveBeenLastCalledWith(
				expect.objectContaining({ id: "1" }),
				1
			)
		})

		it("steps with the up and down arrow keys", async () => {
			const onNavigate = vi.fn()
			const { user } = setup(list, { expenseId: "2", onNavigate })
			await dialog()
			await user.keyboard("{ArrowDown}")
			expect(onNavigate).toHaveBeenLastCalledWith(
				expect.objectContaining({ id: "3" }),
				1
			)
			await user.keyboard("{ArrowUp}")
			expect(onNavigate).toHaveBeenLastCalledWith(
				expect.objectContaining({ id: "1" }),
				1
			)
			expect(onNavigate).toHaveBeenCalledTimes(2)
		})

		it("ignores the arrow keys at the edges, with a modifier, or inside a field", async () => {
			const onNavigate = vi.fn()
			const { user } = setup(list, { expenseId: "1", onNavigate })
			await dialog()
			await user.keyboard("{ArrowUp}")
			await user.keyboard("{Shift>}{ArrowDown}{/Shift}")
			expect(onNavigate).not.toHaveBeenCalled()
			// Inside a field the arrows belong to the field (focus stays within the sheet)
			const field = document.createElement("input")
			screen.getByRole("dialog").appendChild(field)
			field.focus()
			await user.keyboard("{ArrowDown}")
			expect(onNavigate).not.toHaveBeenCalled()
		})

		it("shows the place in the month next to the arrows", async () => {
			setup(list, { expenseId: "2", onNavigate: vi.fn() })
			const panel = await dialog()
			expect(panel.getByText("(2/3)")).toBeInTheDocument()
			expect(panel.getByText("Expense 2 of 3")).toBeInTheDocument()
		})

		it("disables Previous on the first row and Next on the last", async () => {
			setup(list, { expenseId: "1", onNavigate: vi.fn() })
			const first = await dialog()
			expect(
				first.getByRole("button", { name: "Previous expense" })
			).toBeDisabled()
			expect(first.getByRole("button", { name: "Next expense" })).toBeEnabled()
		})

		it("disables Next on the last row", async () => {
			setup(list, { expenseId: "3", onNavigate: vi.fn() })
			const last = await dialog()
			expect(last.getByRole("button", { name: "Next expense" })).toBeDisabled()
			expect(
				last.getByRole("button", { name: "Previous expense" })
			).toBeEnabled()
		})

		describe("across pages", () => {
			// 25 expenses: pages of 10, but the fixtures only list the rows that matter
			const pages: Record<number, Expense[]> = {
				1: [expense(1), expense(2)],
				2: [expense(3), expense(4)],
				3: [expense(5)]
			}
			const setupPaged = (current: number, expenseId: string) => {
				nav.search = `period=2026-11&page=${current}`
				vi.spyOn(api, "getPage").mockImplementation(
					async (_endpoint, params) =>
						({
							data: pages[Number(params?.page ?? 1)] ?? [],
							total: 25,
							totalAmount: 0,
							page: Number(params?.page ?? 1),
							limit: 10
						}) as ExpensePage
				)
				vi.spyOn(api, "get").mockResolvedValue({} as never)
				const onNavigate = vi.fn()
				const { wrapper } = createQueryWrapper()
				render(
					<ExpenseDetailsPanel
						onClose={vi.fn()}
						onNavigate={onNavigate}
						periodId="p1"
						expenseId={expenseId}
						canEdit
					/>,
					{ wrapper }
				)
				return {
					onNavigate,
					user: userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
				}
			}

			it("counts from the start of the month, not of the page", async () => {
				setupPaged(2, "4")
				const panel = await dialog()
				// Page 2 holds expenses 11 to 20 of 25; the fixture lists two of them
				expect(panel.getByText("(12/25)")).toBeInTheDocument()
			})

			it("continues to the first expense of the next page from the last row", async () => {
				const { onNavigate, user } = setupPaged(1, "2")
				const panel = await dialog()
				const next = panel.getByRole("button", { name: "Next expense" })
				await vi.waitFor(() => expect(next).toBeEnabled())
				await user.click(next)
				expect(onNavigate).toHaveBeenCalledWith(
					expect.objectContaining({ id: "3" }),
					2
				)
			})

			it("goes back to the last expense of the previous page from the first row", async () => {
				const { onNavigate, user } = setupPaged(2, "3")
				const panel = await dialog()
				const previous = panel.getByRole("button", { name: "Previous expense" })
				await vi.waitFor(() => expect(previous).toBeEnabled())
				await user.click(previous)
				expect(onNavigate).toHaveBeenCalledWith(
					expect.objectContaining({ id: "2" }),
					1
				)
			})

			it("reads a neighbouring page only when standing on its edge", async () => {
				setupPaged(2, "4")
				const panel = await dialog()
				await vi.waitFor(() =>
					expect(
						panel.getByRole("button", { name: "Next expense" })
					).toBeEnabled()
				)
				const pagesAsked = vi
					.mocked(api.getPage)
					.mock.calls.map(([, params]) => Number(params?.page))
				// Row 4 is the last of page 2, so only page 3 is read besides page 2 itself
				expect(new Set(pagesAsked)).toEqual(new Set([2, 3]))
			})

			it("stops at the very first and very last row", async () => {
				setupPaged(1, "1")
				const first = await dialog()
				await vi.waitFor(() =>
					expect(
						first.getByRole("button", { name: "Next expense" })
					).toBeEnabled()
				)
				expect(
					first.getByRole("button", { name: "Previous expense" })
				).toBeDisabled()
			})

			it("disables Next on the last row of the last page", async () => {
				const { onNavigate } = setupPaged(3, "5")
				// 25 expenses make 3 pages, so there is nothing after page 3
				const panel = await dialog()
				expect(
					panel.getByRole("button", { name: "Next expense" })
				).toBeDisabled()
				expect(onNavigate).not.toHaveBeenCalled()
			})
		})

		it("disables both for an expense that isn't on the page", async () => {
			vi.spyOn(api, "getPage").mockResolvedValue(page(list))
			vi.spyOn(api, "get").mockResolvedValue(expense(77) as never)
			const { wrapper } = createQueryWrapper()
			render(
				<ExpenseDetailsPanel
					onClose={vi.fn()}
					onNavigate={vi.fn()}
					periodId="p1"
					expenseId="77"
					canEdit
				/>,
				{ wrapper }
			)
			const panel = await dialog()
			expect(
				panel.getByRole("button", { name: "Previous expense" })
			).toBeDisabled()
			expect(panel.getByRole("button", { name: "Next expense" })).toBeDisabled()
		})

		it("leaves the arrows and the count out when nothing handles them", async () => {
			setup(list, { expenseId: "2" })
			const panel = await dialog()
			expect(panel.queryByRole("button", { name: "Next expense" })).toBeNull()
			expect(panel.queryByText("(2/3)")).toBeNull()
		})
	})

	it("renders nothing while nothing is selected", () => {
		vi.spyOn(api, "getPage").mockResolvedValue(page([expense(1)]))
		const { wrapper } = createQueryWrapper()
		render(
			<ExpenseDetailsPanel
				onClose={vi.fn()}
				periodId="p1"
				expenseId={null}
				canEdit
			/>,
			{ wrapper }
		)
		expect(screen.queryByRole("dialog")).toBeNull()
	})

	it("is a bottom sheet on the phone", async () => {
		phone.value = true
		setup([expense(1)])
		expect(await screen.findByRole("dialog")).toHaveAttribute(
			"data-side",
			"bottom"
		)
	})
})
