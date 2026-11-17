// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import type { BudgetEnvelope } from "@/types"
import { EnvelopeFormPanel } from "./EnvelopeFormPanel"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast }))

vi.mock("@/hooks/use-media-query", () => ({
	PHONE_QUERY: "phone",
	useMediaQuery: () => false
}))

const categories = [
	{ id: "c1", name: "Grocery", hasBudgetEnvelope: true },
	{ id: "c2", name: "Fuel", hasBudgetEnvelope: true },
	{ id: "c3", name: "Rent", hasBudgetEnvelope: false }
]

const existing: BudgetEnvelope = {
	id: "e1",
	budgetPeriodId: "p1",
	categoryId: "c1",
	allocatedAmount: 600,
	spentAmount: 245.18,
	spendUpdatedAt: null,
	createdAt: "",
	updatedAt: "",
	deletedAt: null
}

let envelopesOnServer: BudgetEnvelope[]

beforeEach(() => {
	toast.success.mockClear()
	toast.error.mockClear()
	envelopesOnServer = [existing]
	vi.spyOn(api, "get").mockImplementation(((endpoint: string) =>
		Promise.resolve(
			endpoint.startsWith("categories") ? categories : envelopesOnServer
		)) as never)
})

afterEach(() => {
	vi.restoreAllMocks()
})

const setup = (
	props: {
		envelope?: BudgetEnvelope
		onSaved?: (envelope: BudgetEnvelope | null) => void
	} = {}
) => {
	const onClose = vi.fn()
	const { wrapper } = createQueryWrapper()
	render(
		<EnvelopeFormPanel
			open
			onClose={onClose}
			periodId="p1"
			month={{ year: 2026, month: 11 }}
			{...props}
		/>,
		{ wrapper }
	)
	return { onClose, user: userEvent.setup() }
}

const ready = () => screen.findByLabelText("Budget")

describe("EnvelopeFormPanel (add)", () => {
	it("offers only envelope categories without an envelope this month", async () => {
		const { user } = setup()
		await ready()

		expect(
			screen.getByRole("dialog", { name: "Add envelope" })
		).toHaveTextContent("November 2026")
		await user.click(screen.getByRole("combobox", { name: "Category" }))
		expect(
			(await screen.findAllByRole("option")).map((o) => o.textContent)
		).toEqual(["Fuel"])
	})

	it("marks both fields invalid without a visible message", async () => {
		const { user } = setup()
		await ready()

		await user.click(screen.getByRole("button", { name: "Save" }))

		expect(screen.getByRole("combobox", { name: "Category" })).toHaveAttribute(
			"aria-invalid",
			"true"
		)
		expect(screen.getByLabelText("Budget")).toHaveAttribute(
			"aria-invalid",
			"true"
		)
		// The reasons stay in the page for screen readers only
		expect(screen.getByText("Choose a category.")).toHaveClass("sr-only")
		expect(
			screen.getByText("Enter a budget above 0, up to 2 decimals.")
		).toHaveClass("sr-only")
	})

	it("creates the envelope, toasts and closes", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue({ id: "e2" } as never)
		const onSaved = vi.fn()
		const { user, onClose } = setup({ onSaved })
		await ready()

		await user.click(screen.getByRole("combobox", { name: "Category" }))
		await user.click(await screen.findByRole("option", { name: "Fuel" }))
		// The digits fill in from the cents
		await user.type(screen.getByLabelText("Budget"), "30000")
		await user.click(screen.getByRole("button", { name: "Save" }))

		await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
		expect(post).toHaveBeenCalledWith("budget-envelopes", {
			budgetPeriodId: "p1",
			categoryId: "c2",
			allocatedAmount: 300
		})
		expect(onSaved).toHaveBeenCalledWith(null)
		expect(toast.success).toHaveBeenCalledWith(
			"Fuel envelope added to November 2026."
		)
	})

	it("keeps the form and says so when the category already has an envelope (409)", async () => {
		vi.spyOn(api, "post").mockRejectedValue(new ApiError("exists", 409))
		const { user, onClose } = setup()
		await ready()

		await user.click(screen.getByRole("combobox", { name: "Category" }))
		await user.click(await screen.findByRole("option", { name: "Fuel" }))
		await user.type(screen.getByLabelText("Budget"), "10000")
		await user.click(screen.getByRole("button", { name: "Save" }))

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Fuel already has an envelope this month.",
				expect.anything()
			)
		)
		expect(onClose).not.toHaveBeenCalled()
		expect(screen.getByLabelText("Budget")).toHaveValue("100.00")
	})

	it("shows the month-closed message for a 422", async () => {
		vi.spyOn(api, "post").mockRejectedValue(new ApiError("past", 422))
		const { user } = setup()
		await ready()

		await user.click(screen.getByRole("combobox", { name: "Category" }))
		await user.click(await screen.findByRole("option", { name: "Fuel" }))
		await user.type(screen.getByLabelText("Budget"), "10000")
		await user.click(screen.getByRole("button", { name: "Save" }))

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Envelopes of past months can't be changed.",
				expect.anything()
			)
		)
	})

	it("closes with Cancel without a request", async () => {
		const post = vi.spyOn(api, "post")
		const { user, onClose } = setup()
		await ready()
		await user.click(screen.getByRole("button", { name: "Cancel" }))
		expect(onClose).toHaveBeenCalled()
		expect(post).not.toHaveBeenCalled()
	})
})

describe("EnvelopeFormPanel (edit budget)", () => {
	it("shows the category as text, the budget filled in and the spend", async () => {
		setup({ envelope: existing })
		await ready()

		expect(
			screen.getByRole("dialog", { name: "Edit budget" })
		).toHaveTextContent("November 2026")
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(screen.getByText("Grocery")).toBeDefined()
		expect(screen.getByLabelText("Budget")).toHaveValue("600.00")
		expect(screen.getByText("Spent so far: CAD 245.18")).toBeDefined()
		expect(screen.getByLabelText("Budget")).toHaveFocus()
	})

	it("hides the spend hint when the spend is unavailable", async () => {
		setup({ envelope: { ...existing, spentAmount: null } })
		await ready()
		expect(screen.queryByText(/Spent so far/)).toBeNull()
	})

	it("sends only the new budget", async () => {
		const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never)
		const onSaved = vi.fn()
		const { user, onClose } = setup({ envelope: existing, onSaved })
		await ready()

		await user.clear(screen.getByLabelText("Budget"))
		await user.type(screen.getByLabelText("Budget"), "70000")
		await user.click(screen.getByRole("button", { name: "Save" }))

		await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
		expect(patch).toHaveBeenCalledWith("budget-envelopes/e1", {
			allocatedAmount: 700
		})
		expect(onSaved).toHaveBeenCalledWith(existing)
		expect(toast.success).toHaveBeenCalledWith("Grocery budget updated.")
	})

	it("holds the panel open while a save is in flight", async () => {
		let finish: (value: unknown) => void = () => {}
		const patch = vi
			.spyOn(api, "patch")
			.mockReturnValue(new Promise((resolve) => (finish = resolve)) as never)
		const { user, onClose } = setup({ envelope: existing })
		await ready()

		await user.type(screen.getByLabelText("Budget"), "0")
		await user.click(screen.getByRole("button", { name: "Save" }))
		await vi.waitFor(() => expect(patch).toHaveBeenCalledTimes(1))

		// Neither Escape, Cancel nor a second Save may close it or send a second request
		await user.keyboard("{Escape}")
		expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
		expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
		expect(onClose).not.toHaveBeenCalled()
		expect(patch).toHaveBeenCalledTimes(1)

		finish({})
		await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
	})

	it("closes without a request when the budget is unchanged", async () => {
		const patch = vi.spyOn(api, "patch")
		const onSaved = vi.fn()
		const { user, onClose } = setup({ envelope: existing, onSaved })
		await ready()

		await user.click(screen.getByRole("button", { name: "Save" }))

		await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
		expect(patch).not.toHaveBeenCalled()
		expect(onSaved).toHaveBeenCalledWith(existing)
	})

	it("says the envelope is gone for a 404 and keeps the form", async () => {
		vi.spyOn(api, "patch").mockRejectedValue(new ApiError("gone", 404))
		const { user, onClose } = setup({ envelope: existing })
		await ready()

		await user.type(screen.getByLabelText("Budget"), "0")
		await user.click(screen.getByRole("button", { name: "Save" }))

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"This envelope no longer exists.",
				expect.anything()
			)
		)
		expect(onClose).not.toHaveBeenCalled()
	})
})
