// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { todayIso } from "@/lib/format-date"
import { createQueryWrapper } from "@/test/query-wrapper"
import { ExpenseFormPanel } from "./ExpenseFormPanel"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast }))

vi.mock("@/hooks/use-media-query", () => ({
	PHONE_QUERY: "phone",
	useMediaQuery: () => false
}))

const lookup = (id: string, name: string, extra = {}) => ({
	id,
	name,
	createdAt: "",
	updatedAt: "",
	deletedAt: null,
	...extra
})

const data: Record<string, unknown[]> = {
	categories: [lookup("c1", "Groceries"), lookup("c2", "Utilities")],
	"payment-types": [
		lookup("card", "Credit Card", { hasStatement: true }),
		lookup("cash", "Cash", { hasStatement: false })
	],
	banks: [lookup("b1", "CIBC"), lookup("b2", "RBC")],
	stores: [lookup("s1", "Costco")],
	"budget-periods": [
		{ id: "p1", year: 2026, month: 11 },
		{ id: "p2", year: 2026, month: 12 }
	]
}

const created = { id: "e1" }

beforeEach(() => {
	// Fixed "today" in the month the panel is for, so the purchase date default is known
	vi.useFakeTimers({ toFake: ["Date"] })
	vi.setSystemTime(new Date("2026-11-15T12:00:00Z"))
	window.localStorage.clear()
	toast.success.mockClear()
	toast.error.mockClear()
	vi.spyOn(api, "get").mockImplementation(((endpoint: string) =>
		Promise.resolve(data[endpoint] ?? [])) as never)
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

const setup = (props: { onSaved?: () => void } = {}) => {
	const onClose = vi.fn()
	const { wrapper, queryClient } = createQueryWrapper()
	render(
		<ExpenseFormPanel
			open
			onClose={onClose}
			periodId="p1"
			month={{ year: 2026, month: 11 }}
			{...props}
		/>,
		{ wrapper }
	)
	return { onClose, queryClient, user: userEvent.setup() }
}

const ready = () => screen.findByLabelText("Description")

const choose = async (
	user: ReturnType<typeof userEvent.setup>,
	field: string,
	option: string
) => {
	await user.click(screen.getByRole("combobox", { name: field }))
	await user.click(await screen.findByRole("option", { name: option }))
}

const fillRequired = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.type(screen.getByLabelText("Description"), "Weekly shop")
	await choose(user, "Category", "Groceries")
	await choose(user, "Payment type", "Credit Card")
	await choose(user, "Bank", "CIBC")
	await user.type(screen.getByLabelText("Amount"), "25.00")
}

describe("ExpenseFormPanel", () => {
	it("shows the form for the month on screen", async () => {
		setup()
		expect(
			screen.getByRole("status", { name: "Loading the form" })
		).toBeVisible()
		await ready()
		expect(
			screen.getByRole("dialog", { name: "Add expense" })
		).toHaveTextContent("November 2026")
		expect(screen.getByRole("button", { name: "Finish & close" })).toBeVisible()
		expect(
			screen.getByRole("button", { name: "Finish & add another" })
		).toBeVisible()
		expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible()
	})

	it("marks the required fields, and the bank only when the payment type has a statement", async () => {
		const { user } = setup()
		await ready()
		const stars = () => screen.getAllByText("*").length
		// Description, category, payment type and amount
		expect(stars()).toBe(4)
		await choose(user, "Payment type", "Credit Card")
		expect(stars()).toBe(5)
		await choose(user, "Payment type", "Cash")
		expect(stars()).toBe(4)
	})

	it("saves an expense in the month and closes (M-14)", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue(created as never)
		const onSaved = vi.fn()
		const { user, onClose } = setup({ onSaved })
		await ready()
		await fillRequired(user)

		await user.click(screen.getByRole("button", { name: "Finish & close" }))

		await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
		expect(post).toHaveBeenCalledWith("expenses", {
			type: "one-time",
			budgetPeriodId: "p1",
			categoryId: "c1",
			paymentTypeId: "card",
			bankId: "b1",
			storeId: null,
			description: "Weekly shop",
			amount: 25
		})
		expect(onSaved).toHaveBeenCalledOnce()
		expect(toast.success).toHaveBeenCalledWith(
			"Weekly shop added to November 2026."
		)
	})

	it("submits with Enter like Finish & close", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue(created as never)
		const { user, onClose } = setup()
		await ready()
		await fillRequired(user)
		await user.type(screen.getByLabelText("Amount"), "{Enter}")
		await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
		expect(post).toHaveBeenCalledOnce()
	})

	it("sends the optional fields when filled", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue(created as never)
		const { user } = setup()
		await ready()
		await fillRequired(user)
		await choose(user, "Store", "Costco")
		await user.type(screen.getByLabelText("Due"), "2026-11-20")
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		await vi.waitFor(() => expect(post).toHaveBeenCalled())
		expect(post.mock.calls[0][1]).toMatchObject({
			storeId: "s1",
			dueAt: "2026-11-20"
		})
	})

	it("asks for the missing required fields and saves nothing", async () => {
		const post = vi.spyOn(api, "post")
		const { user, onClose } = setup()
		await ready()
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		await vi.waitFor(() =>
			expect(screen.getByLabelText("Description")).toHaveAttribute(
				"aria-invalid",
				"true"
			)
		)
		for (const name of ["Category", "Payment type"]) {
			expect(screen.getByRole("combobox", { name })).toHaveAttribute(
				"aria-invalid",
				"true"
			)
		}
		expect(screen.getByLabelText("Amount")).toHaveAttribute(
			"aria-invalid",
			"true"
		)
		// Sighted users get the red border only; the reasons are for screen readers
		for (const alert of screen.getAllByRole("alert")) {
			expect(alert).toHaveClass("sr-only")
		}

		expect(post).not.toHaveBeenCalled()
		expect(onClose).not.toHaveBeenCalled()
	})

	it("points each invalid select at its reason, like the text fields", async () => {
		const { user } = setup()
		await ready()
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		await vi.waitFor(() =>
			expect(
				screen.getByRole("combobox", { name: "Category" })
			).toHaveAttribute("aria-invalid", "true")
		)
		for (const [name, id] of [
			["Category", "expense-category-error"],
			["Payment type", "expense-payment-type-error"]
		]) {
			const trigger = screen.getByRole("combobox", { name })
			expect(trigger).toHaveAttribute("aria-describedby", id)
			expect(document.getElementById(id)).toHaveTextContent(/Choose a/)
		}
		// A select that is fine points at nothing
		expect(screen.getByRole("combobox", { name: "Store" })).not.toHaveAttribute(
			"aria-describedby"
		)
	})

	it("requires a bank for a payment type with a statement (M-14)", async () => {
		const post = vi.spyOn(api, "post")
		const { user } = setup()
		await ready()
		await user.type(screen.getByLabelText("Description"), "Hydro")
		await choose(user, "Category", "Utilities")
		await choose(user, "Payment type", "Credit Card")
		await user.type(screen.getByLabelText("Amount"), "25")
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		expect(
			await screen.findByText("Bank is required for this payment type.")
		).toBeInTheDocument()
		expect(screen.getByRole("combobox", { name: "Bank" })).toHaveAttribute(
			"aria-invalid",
			"true"
		)
		expect(post).not.toHaveBeenCalled()

		// Cash needs no bank, and the message goes away
		await choose(user, "Payment type", "Cash")
		expect(
			screen.queryByText("Bank is required for this payment type.")
		).toBeNull()
	})

	it("asks for an amount when it is left at zero", async () => {
		const post = vi.spyOn(api, "post")
		const { user } = setup()
		await ready()
		await fillRequired(user)
		const field = screen.getByLabelText("Amount")
		await user.clear(field)
		await user.type(field, "0")
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		expect(
			await screen.findByText("Enter an amount above 0, up to 2 decimals.")
		).toBeInTheDocument()
		expect(field).toHaveAttribute("aria-invalid", "true")
		expect(post).not.toHaveBeenCalled()
	})

	it("rejects an amount over the limit instead of changing it", async () => {
		const post = vi.spyOn(api, "post")
		const { user } = setup()
		await ready()
		await fillRequired(user)
		const field = screen.getByLabelText("Amount")
		await user.clear(field)
		// One digit past the largest amount, 99,999,999.99
		await user.type(field, "10000000000")
		expect(field).toHaveValue("100,000,000.00")
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		expect(
			await screen.findByText("The amount can't be more than 99,999,999.99.")
		).toBeInTheDocument()
		expect(field).toHaveAttribute("aria-invalid", "true")
		expect(post).not.toHaveBeenCalled()
	})

	it("formats the amount as it is typed, filling in from the cents", async () => {
		const { user } = setup()
		await ready()
		const field = screen.getByLabelText("Amount")
		await user.type(field, "10050")
		expect(field).toHaveValue("100.50")
		await user.type(field, "00")
		expect(field).toHaveValue("10,050.00")
		await user.clear(field)
		await user.type(field, "abc9")
		expect(field).toHaveValue("0.09")
	})

	it("sends the formatted amount as a number", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue(created as never)
		const { user } = setup()
		await ready()
		await fillRequired(user)
		const field = screen.getByLabelText("Amount")
		await user.clear(field)
		await user.type(field, "1005000")
		expect(field).toHaveValue("10,050.00")
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		await vi.waitFor(() => expect(post).toHaveBeenCalled())
		expect(post.mock.calls[0][1]).toMatchObject({ amount: 10_050 })
	})

	it("doesn't offer purchase dates after today", async () => {
		setup()
		await ready()
		expect(screen.getByLabelText("Purchased")).toHaveAttribute(
			"max",
			todayIso()
		)
		expect(screen.getByLabelText("Due")).not.toHaveAttribute("max")
	})

	it("rejects a purchase date in the future before sending anything", async () => {
		const post = vi.spyOn(api, "post")
		const { user } = setup()
		await ready()
		await fillRequired(user)
		await user.type(screen.getByLabelText("Purchased"), "2999-01-01")
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		expect(
			await screen.findByText("The purchase date can't be in the future.")
		).toBeInTheDocument()
		expect(screen.getByLabelText("Purchased")).toHaveAttribute(
			"aria-invalid",
			"true"
		)
		expect(post).not.toHaveBeenCalled()
	})

	it("marks the Purchased field and says why when the backend rejects the date", async () => {
		vi.spyOn(api, "post").mockRejectedValue(
			new ApiError("Date cannot be in the future", 400)
		)
		const { user, onClose } = setup()
		await ready()
		await fillRequired(user)
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		expect(
			await screen.findByText("The purchase date can't be in the future.")
		).toBeInTheDocument()
		expect(toast.error).toHaveBeenCalledWith(
			"The purchase date can't be in the future.",
			expect.anything()
		)
		expect(screen.getByLabelText("Purchased")).toHaveAttribute(
			"aria-invalid",
			"true"
		)
		expect(onClose).not.toHaveBeenCalled()
		expect(screen.getByLabelText("Description")).toHaveValue("Weekly shop")
	})

	it("keeps the panel open for the next expense with Finish & add another", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue(created as never)
		const { user, onClose } = setup()
		await ready()
		await fillRequired(user)
		await user.type(screen.getByLabelText("Due"), "2026-11-20")

		await user.click(
			screen.getByRole("button", { name: "Finish & add another" })
		)

		await vi.waitFor(() => expect(post).toHaveBeenCalledOnce())
		await vi.waitFor(() =>
			expect(screen.getByLabelText("Description")).toHaveValue("")
		)
		expect(onClose).not.toHaveBeenCalled()
		expect(screen.getByLabelText("Amount")).toHaveValue("")
		expect(screen.getByLabelText("Due")).toHaveValue("")
		expect(
			screen.getByRole("combobox", { name: "Category" })
		).toHaveTextContent("Groceries")
		expect(
			screen.getByRole("combobox", { name: "Payment type" })
		).toHaveTextContent("Credit Card")
		expect(screen.getByRole("combobox", { name: "Bank" })).toHaveTextContent(
			"CIBC"
		)
		await vi.waitFor(() =>
			expect(screen.getByLabelText("Description")).toHaveFocus()
		)
		expect(toast.success).toHaveBeenCalledOnce()
	})

	it("always opens empty: nothing is remembered between expenses", async () => {
		// Values an earlier version stored on this device are ignored
		window.localStorage.setItem(
			"month.expense-form.last",
			JSON.stringify({ categoryId: "c2", paymentTypeId: "card", bankId: "b2" })
		)
		vi.spyOn(api, "post").mockResolvedValue(created as never)
		const { user, onClose } = setup()
		await ready()
		for (const [name, text] of [
			["Category", "Select a category"],
			["Payment type", "Select type"],
			["Bank", "Select bank"]
		]) {
			expect(screen.getByRole("combobox", { name })).toHaveTextContent(text)
		}

		await fillRequired(user)
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
		// Saving stores nothing for the next time
		expect(window.localStorage.getItem("month.expense-form.last")).toBe(
			JSON.stringify({ categoryId: "c2", paymentTypeId: "card", bankId: "b2" })
		)
	})

	it("lets optional fields be cleared", async () => {
		const { user } = setup()
		await ready()
		await choose(user, "Store", "Costco")
		expect(screen.getByRole("combobox", { name: "Store" })).toHaveTextContent(
			"Costco"
		)
		await choose(user, "Store", "None")
		expect(screen.getByRole("combobox", { name: "Store" })).toHaveTextContent(
			"Optional"
		)
	})

	it("marks the Bank field and says why when the backend asks for a bank", async () => {
		vi.spyOn(api, "post").mockRejectedValue(
			new ApiError("bankId is required for this payment type", 400)
		)
		const { user, onClose } = setup()
		await ready()
		await fillRequired(user)
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		expect(
			await screen.findByText("Bank is required for this payment type.")
		).toBeInTheDocument()
		expect(toast.error).toHaveBeenCalledWith(
			"Bank is required for this payment type.",
			expect.anything()
		)
		expect(screen.getByRole("combobox", { name: "Bank" })).toHaveAttribute(
			"aria-invalid",
			"true"
		)
		expect(onClose).not.toHaveBeenCalled()
		expect(screen.getByLabelText("Description")).toHaveValue("Weekly shop")
	})

	it("says which lookup is gone and refreshes the lists", async () => {
		vi.spyOn(api, "post").mockRejectedValue(
			new ApiError("Category with id c1 not found", 404)
		)
		const { user } = setup()
		await ready()
		await fillRequired(user)
		const before = vi.mocked(api.get).mock.calls.length
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		expect(
			await screen.findByText("Category no longer exists. Choose another.")
		).toBeInTheDocument()
		expect(toast.error).toHaveBeenCalledWith(
			"Category no longer exists. Choose another.",
			expect.anything()
		)
		await vi.waitFor(() =>
			expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(before)
		)
	})

	it("shows the generic message for other failures and keeps what was typed", async () => {
		vi.spyOn(api, "post").mockRejectedValue(new ApiError("boom", 500))
		const { user, onClose } = setup()
		await ready()
		await fillRequired(user)
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Something went wrong. Try again.",
				expect.anything()
			)
		)
		expect(onClose).not.toHaveBeenCalled()
		expect(screen.getByLabelText("Amount")).toHaveValue("25.00")
		expect(toast.success).not.toHaveBeenCalled()
	})

	it("can't be dismissed while the save is in flight", async () => {
		let finish: (expense: unknown) => void = () => {}
		const post = vi.spyOn(api, "post").mockReturnValue(
			new Promise((resolve) => {
				finish = resolve
			}) as never
		)
		const { user, onClose } = setup()
		await ready()
		await fillRequired(user)
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		await vi.waitFor(() => expect(post).toHaveBeenCalled())

		// Every way out is held back until the request answers
		expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
		await user.click(screen.getByRole("button", { name: "Close" }))
		await user.keyboard("{Escape}")
		expect(onClose).not.toHaveBeenCalled()
		expect(screen.getByRole("dialog", { name: "Add expense" })).toBeVisible()

		finish(created)
		await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce())
	})

	it("can be dismissed again once a failed save is over", async () => {
		vi.spyOn(api, "post").mockRejectedValue(new ApiError("boom", 500))
		const { user, onClose } = setup()
		await ready()
		await fillRequired(user)
		await user.click(screen.getByRole("button", { name: "Finish & close" }))
		await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())
		await vi.waitFor(() =>
			expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled()
		)
		await user.keyboard("{Escape}")
		expect(onClose).toHaveBeenCalledOnce()
	})

	it("closes without saving on Cancel", async () => {
		const post = vi.spyOn(api, "post")
		const { user, onClose } = setup()
		await ready()
		await user.type(screen.getByLabelText("Description"), "Draft")
		await user.click(screen.getByRole("button", { name: "Cancel" }))
		expect(onClose).toHaveBeenCalledOnce()
		expect(post).not.toHaveBeenCalled()
	})

	it("keeps the form and what was typed when a refetch of the lists fails", async () => {
		const { user, queryClient } = setup()
		await ready()
		await user.type(screen.getByLabelText("Description"), "Draft expense")

		// The lists were loaded; a later refetch (window focus, say) fails
		vi.mocked(api.get).mockRejectedValue(new ApiError("boom", 500))
		await queryClient.refetchQueries({ queryKey: ["categories"] })

		await vi.waitFor(() =>
			expect(queryClient.getQueryState(["categories"])?.status).toBe("error")
		)
		// Let the screen react to the failed refetch
		await new Promise((resolve) => setTimeout(resolve, 50))
		expect(screen.queryByText("Couldn't load the form options")).toBeNull()
		expect(screen.getByLabelText("Description")).toHaveValue("Draft expense")
		expect(screen.getByRole("combobox", { name: "Category" })).toBeVisible()
	})

	it("offers a retry when the lists don't load", async () => {
		const get = vi
			.spyOn(api, "get")
			.mockRejectedValue(new ApiError("boom", 500))
		const { user } = setup()
		const alert = await screen.findByRole("alert")
		expect(
			within(alert).getByText("Couldn't load the form options")
		).toBeVisible()
		get.mockImplementation(((endpoint: string) =>
			Promise.resolve(data[endpoint] ?? [])) as never)
		await user.click(within(alert).getByRole("button", { name: "Retry" }))
		expect(await ready()).toBeVisible()
	})

	describe("installments (M-15)", () => {
		const fillPlan = async (user: ReturnType<typeof userEvent.setup>) => {
			await user.click(screen.getByRole("tab", { name: "Installments" }))
			await user.type(screen.getByLabelText("Description"), "Laptop")
			await choose(user, "Category", "Groceries")
			await choose(user, "Payment type", "Cash")
			await user.type(screen.getByLabelText("Amount per payment"), "5000")
			await user.type(screen.getByLabelText("Number of payments"), "3")
			await user.type(
				screen.getByLabelText("First purchase date"),
				"2026-11-15"
			)
		}

		it("swaps the one-time dates for the plan fields and keeps the shared values", async () => {
			const { user } = setup()
			await ready()
			await user.type(screen.getByLabelText("Description"), "Laptop")
			expect(screen.getByLabelText("Purchased")).toBeVisible()

			await user.click(screen.getByRole("tab", { name: "Installments" }))

			expect(screen.getByLabelText("Description")).toHaveValue("Laptop")
			expect(screen.queryByLabelText("Purchased")).toBeNull()
			expect(screen.queryByLabelText("Paid")).toBeNull()
			expect(screen.getByLabelText("Amount per payment")).toBeVisible()
			expect(screen.getByLabelText("Number of payments")).toBeVisible()
			expect(screen.getByLabelText("First purchase date")).toBeVisible()
			expect(
				screen.getByRole("combobox", { name: "Interval" })
			).toHaveTextContent("Monthly (30 days)")
		})

		it("shows the plan as it is typed", async () => {
			const { user } = setup()
			await ready()
			expect(screen.queryByTestId("plan-summary")).toBeNull()
			await fillPlan(user)
			expect(screen.getByTestId("plan-summary")).toHaveTextContent(
				"3 payments of CAD 50.00, every 30 days, from 15 Nov 2026 to 14 Jan 2027. Total CAD 150.00."
			)

			await choose(user, "Interval", "Bi-weekly (14 days)")
			expect(screen.getByTestId("plan-summary")).toHaveTextContent(
				"every 14 days, from 15 Nov 2026 to 13 Dec 2026"
			)
		})

		it("asks for the number of days on a custom interval", async () => {
			const { user } = setup()
			await ready()
			await fillPlan(user)
			await choose(user, "Interval", "Custom")
			await user.type(screen.getByLabelText("Days between payments"), "10")
			expect(screen.getByTestId("plan-summary")).toHaveTextContent(
				"every 10 days, from 15 Nov 2026 to 5 Dec 2026"
			)
		})

		it("saves the plan and says which months got payments", async () => {
			const post = vi.spyOn(api, "post").mockResolvedValue(created as never)
			const { user, onClose } = setup()
			await ready()
			await fillPlan(user)

			await user.click(screen.getByRole("button", { name: "Finish & close" }))

			await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
			expect(post).toHaveBeenCalledWith("expenses", {
				type: "installment",
				budgetPeriodId: "p1",
				categoryId: "c1",
				paymentTypeId: "cash",
				bankId: null,
				storeId: null,
				description: "Laptop",
				amountPerInstallment: 50,
				totalInstallments: 3,
				paymentIntervalDays: 30,
				firstPurchasedAt: "2026-11-15"
			})
			expect(toast.success).toHaveBeenCalledWith(
				"2 payments added to Nov 2026 – Dec 2026. The rest will appear as those months are opened."
			)
		})

		it("needs at least 2 payments and the first purchase date", async () => {
			const post = vi.spyOn(api, "post")
			const { user } = setup()
			await ready()
			await user.click(screen.getByRole("tab", { name: "Installments" }))
			await user.type(screen.getByLabelText("Number of payments"), "1")
			await user.click(screen.getByRole("button", { name: "Finish & close" }))

			expect(screen.getByLabelText("Number of payments")).toHaveAttribute(
				"aria-invalid",
				"true"
			)
			expect(screen.getByLabelText("First purchase date")).toHaveAttribute(
				"aria-invalid",
				"true"
			)
			expect(post).not.toHaveBeenCalled()
		})

		it("doesn't offer a first purchase date after today", async () => {
			const { user } = setup()
			await ready()
			await user.click(screen.getByRole("tab", { name: "Installments" }))
			expect(screen.getByLabelText("First purchase date")).toHaveAttribute(
				"max",
				todayIso()
			)
		})

		it("stops a plan that falls in no opened month, before sending", async () => {
			const post = vi.spyOn(api, "post")
			const { user } = setup()
			await ready()
			await fillPlan(user)
			const date = screen.getByLabelText("First purchase date")
			await user.clear(date)
			await user.type(date, "2026-06-01")
			await user.click(screen.getByRole("button", { name: "Finish & close" }))

			expect(post).not.toHaveBeenCalled()
			expect(date).toHaveAttribute("aria-invalid", "true")
			expect(toast.error).toHaveBeenCalledWith(
				"Open the month of the first payment before adding this plan.",
				expect.anything()
			)
		})

		it("asks again before deciding a plan can't be placed, in case a month was opened elsewhere", async () => {
			let opened = [{ id: "p0", year: 2026, month: 10 }]
			vi.spyOn(api, "get").mockImplementation(((endpoint: string) =>
				Promise.resolve(
					endpoint === "budget-periods" ? opened : (data[endpoint] ?? [])
				)) as never)
			const post = vi.spyOn(api, "post").mockResolvedValue(created as never)
			const { user, onClose } = setup()
			await ready()
			await fillPlan(user)
			// November opens in another tab after this list was loaded
			opened = [...opened, { id: "p1", year: 2026, month: 11 }]

			await user.click(screen.getByRole("button", { name: "Finish & close" }))

			await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
			expect(post).toHaveBeenCalledOnce()
			expect(toast.success).toHaveBeenCalledWith(
				"1 payment added to Nov 2026. The rest will appear as those months are opened."
			)
		})

		it("lets the server decide when the opened months can't be refreshed", async () => {
			let failing = false
			vi.spyOn(api, "get").mockImplementation(((endpoint: string) => {
				if (endpoint === "budget-periods") {
					return failing
						? Promise.reject(new ApiError("Server error", 500))
						: Promise.resolve([{ id: "p0", year: 2026, month: 10 }])
				}
				return Promise.resolve(data[endpoint] ?? [])
			}) as never)
			const post = vi
				.spyOn(api, "post")
				.mockRejectedValue(
					new ApiError(
						"No matching budget periods found for any installment due date",
						400
					)
				)
			const { user } = setup()
			await ready()
			await fillPlan(user)
			failing = true

			await user.click(screen.getByRole("button", { name: "Finish & close" }))

			await vi.waitFor(() => expect(post).toHaveBeenCalledOnce())
			await vi.waitFor(() =>
				expect(screen.getByLabelText("First purchase date")).toHaveAttribute(
					"aria-invalid",
					"true"
				)
			)
			expect(toast.error).toHaveBeenCalledWith(
				"Open the month of the first payment before adding this plan.",
				expect.anything()
			)
		})

		it("doesn't name a month when it can't tell where the plan went", async () => {
			vi.spyOn(api, "get").mockImplementation(((endpoint: string) =>
				endpoint === "budget-periods"
					? Promise.reject(new ApiError("Server error", 500))
					: Promise.resolve(data[endpoint] ?? [])) as never)
			vi.spyOn(api, "post").mockResolvedValue(created as never)
			const { user, onClose } = setup()
			await ready()
			await fillPlan(user)

			await user.click(screen.getByRole("button", { name: "Finish & close" }))

			await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
			expect(toast.success).toHaveBeenCalledWith(
				"Laptop added as an installment plan."
			)
		})

		it("marks the first purchase date when the backend rejects it as in the future", async () => {
			vi.spyOn(api, "post").mockRejectedValue(
				new ApiError("Date cannot be in the future", 400)
			)
			const { user } = setup()
			await ready()
			await fillPlan(user)
			await user.click(screen.getByRole("button", { name: "Finish & close" }))

			await vi.waitFor(() =>
				expect(screen.getByLabelText("First purchase date")).toHaveAttribute(
					"aria-invalid",
					"true"
				)
			)
			expect(toast.error).toHaveBeenCalledWith(
				"The purchase date can't be in the future.",
				expect.anything()
			)
		})

		it("keeps the type and shared values and clears the plan with Finish & add another", async () => {
			vi.spyOn(api, "post").mockResolvedValue(created as never)
			const { user, onClose } = setup()
			await ready()
			await fillPlan(user)

			await user.click(
				screen.getByRole("button", { name: "Finish & add another" })
			)

			await vi.waitFor(() =>
				expect(screen.getByLabelText("Description")).toHaveValue("")
			)
			expect(onClose).not.toHaveBeenCalled()
			expect(screen.getByRole("tab", { name: "Installments" })).toHaveAttribute(
				"data-state",
				"active"
			)
			expect(
				screen.getByRole("combobox", { name: "Category" })
			).toHaveTextContent("Groceries")
			expect(screen.getByLabelText("Amount per payment")).toHaveValue("")
			expect(screen.getByLabelText("Number of payments")).toHaveValue("")
			expect(screen.getByLabelText("First purchase date")).toHaveValue("")
		})
	})

	describe("recurring (M-16)", () => {
		const fillBill = async (user: ReturnType<typeof userEvent.setup>) => {
			await user.click(screen.getByRole("tab", { name: "Recurring" }))
			await user.type(screen.getByLabelText("Description"), "Netflix")
			await choose(user, "Category", "Groceries")
			await choose(user, "Payment type", "Cash")
			await user.type(screen.getByLabelText("Amount"), "1599")
		}

		it("shows the note and drops the Purchased date, keeping the shared values", async () => {
			const { user } = setup()
			await ready()
			await user.type(screen.getByLabelText("Description"), "Netflix")
			expect(screen.queryByTestId("recurring-note")).not.toBeInTheDocument()

			await user.click(screen.getByRole("tab", { name: "Recurring" }))

			expect(screen.getByTestId("recurring-note")).toHaveTextContent(
				"Added to this month and any later months that are already open, and copied into every month you open from now on. Manage it on the Recurring screen."
			)
			expect(screen.getByLabelText("Description")).toHaveValue("Netflix")
			expect(screen.queryByLabelText("Purchased")).not.toBeInTheDocument()
			expect(screen.getByLabelText("Due")).toBeVisible()
			expect(screen.getByLabelText("Paid")).toBeVisible()

			await user.click(screen.getByRole("tab", { name: "One-time" }))
			expect(screen.getByLabelText("Purchased")).toBeVisible()
			expect(screen.queryByTestId("recurring-note")).not.toBeInTheDocument()
		})

		it("saves a recurring bill in the month on screen", async () => {
			const post = vi.spyOn(api, "post").mockResolvedValue(created as never)
			const { user, onClose } = setup()
			await ready()
			await fillBill(user)
			await user.type(screen.getByLabelText("Due"), "2026-11-20")

			await user.click(screen.getByRole("button", { name: "Finish & close" }))

			await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
			expect(post).toHaveBeenCalledWith("expenses", {
				type: "recurring",
				budgetPeriodId: "p1",
				categoryId: "c1",
				paymentTypeId: "cash",
				bankId: null,
				storeId: null,
				description: "Netflix",
				amount: 15.99,
				dueAt: "2026-11-20"
			})
			expect(toast.success).toHaveBeenCalledWith(
				"Netflix added to November 2026."
			)
		})

		it("doesn't send a purchase date typed before switching to recurring", async () => {
			const post = vi.spyOn(api, "post").mockResolvedValue(created as never)
			const { user, onClose } = setup()
			await ready()
			await user.type(screen.getByLabelText("Purchased"), "2026-11-30")
			await fillBill(user)

			await user.click(screen.getByRole("button", { name: "Finish & close" }))

			await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
			expect(post.mock.calls[0][1]).not.toHaveProperty("purchasedAt")
		})

		it("keeps the type and shared values with Finish & add another", async () => {
			vi.spyOn(api, "post").mockResolvedValue(created as never)
			const { user, onClose } = setup()
			await ready()
			await fillBill(user)

			await user.click(
				screen.getByRole("button", { name: "Finish & add another" })
			)

			await vi.waitFor(() =>
				expect(screen.getByLabelText("Description")).toHaveValue("")
			)
			expect(onClose).not.toHaveBeenCalled()
			expect(screen.getByRole("tab", { name: "Recurring" })).toHaveAttribute(
				"data-state",
				"active"
			)
			expect(
				screen.getByRole("combobox", { name: "Category" })
			).toHaveTextContent("Groceries")
			expect(screen.getByLabelText("Amount")).toHaveValue("")
		})

		it("asks for the required fields without sending anything", async () => {
			const post = vi.spyOn(api, "post")
			const { user } = setup()
			await ready()
			await user.click(screen.getByRole("tab", { name: "Recurring" }))

			await user.click(screen.getByRole("button", { name: "Finish & close" }))

			expect(screen.getByLabelText("Description")).toHaveAttribute(
				"aria-invalid",
				"true"
			)
			expect(screen.getByLabelText("Amount")).toHaveAttribute(
				"aria-invalid",
				"true"
			)
			expect(post).not.toHaveBeenCalled()
		})
	})
})
