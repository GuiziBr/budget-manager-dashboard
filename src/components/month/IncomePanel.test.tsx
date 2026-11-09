// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import type { Income } from "@/types"
import { IncomePanel } from "./IncomePanel"

const income = (over: Partial<Income>): Income => ({
	id: "i",
	budgetPeriodId: "p",
	description: "x",
	amount: 1,
	isSalary: false,
	receivedAt: null,
	createdAt: "2026-11-01T00:00:00.000Z",
	updatedAt: "",
	deletedAt: null,
	...over
})

const salaries = [
	income({
		id: "gift",
		description: "Gift",
		amount: 100,
		receivedAt: "2026-11-03T00:00:00.000Z"
	}),
	income({
		id: "s2",
		description: "Salary (2nd half)",
		amount: 3144,
		isSalary: true,
		receivedAt: "2026-11-15T00:00:00.000Z"
	}),
	income({
		id: "s1",
		description: "Salary (1st half)",
		amount: 3000,
		isSalary: true,
		receivedAt: "2026-11-01T00:00:00.000Z"
	})
]

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

const setup = (
	props: Partial<React.ComponentProps<typeof IncomePanel>> = {}
) => {
	const onOpenChange = vi.fn()
	const { wrapper } = createQueryWrapper()
	render(
		<IncomePanel
			open
			onOpenChange={onOpenChange}
			periodId="p"
			month={{ year: 2026, month: 11 }}
			canEdit
			{...props}
		/>,
		{ wrapper }
	)
	return { onOpenChange, user: userEvent.setup() }
}

describe("IncomePanel", () => {
	it("lists the incomes with salary first and the total", async () => {
		vi.spyOn(api, "get").mockResolvedValue(salaries as never)
		setup()
		const list = await screen.findByRole("list", { name: "Income" })
		const rows = within(list).getAllByRole("listitem")
		expect(rows.map((r) => r.textContent)).toEqual([
			expect.stringContaining("Salary (1st half)"),
			expect.stringContaining("Salary (2nd half)"),
			expect.stringContaining("Gift")
		])
		expect(within(rows[0]).getByText("Salary")).toBeInTheDocument()
		expect(within(rows[2]).queryByText("Salary")).toBeNull()
		expect(within(rows[0]).getByText("+ $3,000.00")).toBeInTheDocument()
		expect(within(rows[0]).getByText("Received 1 Nov")).toBeInTheDocument()
		expect(screen.getByText("$6,244.00")).toBeInTheDocument()
		expect(screen.getByText("$6,144.00 of this is salary")).toBeInTheDocument()
	})

	it("names the month under the title", async () => {
		vi.spyOn(api, "get").mockResolvedValue([] as never)
		setup()
		expect(await screen.findByText("November 2026 income")).toBeInTheDocument()
	})

	it("shows received amounts in bold and unreceived ones lighter", async () => {
		vi.spyOn(api, "get").mockResolvedValue([
			income({ id: "a", amount: 10, receivedAt: "2026-11-02T00:00:00.000Z" }),
			income({ id: "b", amount: 20 })
		] as never)
		setup()
		const received = await screen.findByText("+ $10.00")
		expect(received).toHaveClass("font-semibold")
		expect(screen.getByText("+ $20.00")).toHaveClass("font-normal")
		expect(screen.getByText("+ $20.00")).not.toHaveClass("font-semibold")
	})

	it("asks for the month's incomes only", async () => {
		const get = vi.spyOn(api, "get").mockResolvedValue([] as never)
		setup()
		await screen.findByText("No income this month")
		expect(get).toHaveBeenCalledWith("incomes?budgetPeriodId=p")
	})

	it("says there is no salary when none is flagged", async () => {
		vi.spyOn(api, "get").mockResolvedValue([
			income({ description: "Gift", amount: 50 })
		] as never)
		setup()
		expect(await screen.findByText("No salary this month")).toBeInTheDocument()
		expect(screen.getByText("Not received yet")).toBeInTheDocument()
	})

	it("shows an empty state", async () => {
		vi.spyOn(api, "get").mockResolvedValue([] as never)
		setup()
		expect(await screen.findByText("No income this month")).toBeInTheDocument()
		expect(screen.getByText("No salary this month")).toBeInTheDocument()
	})

	it("shows a loading status, then the list", async () => {
		vi.spyOn(api, "get").mockResolvedValue(salaries as never)
		setup()
		expect(screen.getByRole("status")).toHaveTextContent("Loading income")
		await screen.findByRole("list", { name: "Income" })
	})

	it("shows an error with a Retry", async () => {
		const get = vi
			.spyOn(api, "get")
			.mockRejectedValueOnce(new ApiError("boom", 500))
			.mockResolvedValue(salaries as never)
		const { user } = setup()
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Couldn't load the income"
		)
		await user.click(screen.getByRole("button", { name: "Retry" }))
		await screen.findByRole("list", { name: "Income" })
		expect(get).toHaveBeenCalledTimes(2)
	})

	it("offers Add and a row menu when editing is allowed", async () => {
		vi.spyOn(api, "get").mockResolvedValue(salaries as never)
		const onAdd = vi.fn()
		const { user } = setup({ onAdd })
		await user.click(await screen.findByRole("button", { name: "Add income" }))
		expect(onAdd).toHaveBeenCalledOnce()
		await user.click(screen.getByRole("button", { name: "Actions for Gift" }))
		expect(
			await screen.findByRole("menuitem", { name: "Edit" })
		).toBeInTheDocument()
		expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument()
	})

	it("calls onEdit and onDelete from the row menu", async () => {
		vi.spyOn(api, "get").mockResolvedValue(salaries as never)
		const onEdit = vi.fn()
		const onDelete = vi.fn()
		const { user } = setup({ onEdit, onDelete })
		await user.click(
			await screen.findByRole("button", { name: "Actions for Gift" })
		)
		await user.click(await screen.findByRole("menuitem", { name: "Edit" }))
		expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "gift" }))
		await user.click(screen.getByRole("button", { name: "Actions for Gift" }))
		await user.click(await screen.findByRole("menuitem", { name: "Delete" }))
		expect(onDelete).toHaveBeenCalledWith(
			expect.objectContaining({ id: "gift" })
		)
	})

	it("is read-only in a closed month", async () => {
		vi.spyOn(api, "get").mockResolvedValue(salaries as never)
		setup({ canEdit: false })
		await screen.findByRole("list", { name: "Income" })
		expect(screen.queryByRole("button", { name: "Add income" })).toBeNull()
		expect(screen.queryByRole("button", { name: /^Actions for/ })).toBeNull()
	})

	it("closes with the close button and Escape", async () => {
		vi.spyOn(api, "get").mockResolvedValue(salaries as never)
		const { user, onOpenChange } = setup()
		await screen.findByRole("list", { name: "Income" })
		await user.click(screen.getByRole("button", { name: "Close" }))
		expect(onOpenChange).toHaveBeenLastCalledWith(false)
		await user.keyboard("{Escape}")
		expect(onOpenChange).toHaveBeenCalledTimes(2)
	})

	it("doesn't load anything while closed", () => {
		const get = vi.spyOn(api, "get").mockResolvedValue([] as never)
		setup({ open: false })
		expect(get).not.toHaveBeenCalled()
	})

	it("is a bottom sheet on the phone", async () => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: true,
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {}
		}))
		vi.spyOn(api, "get").mockResolvedValue([] as never)
		setup()
		await screen.findByText("No income this month")
		expect(screen.getByRole("dialog").className).toContain("bottom-0")
	})
})
