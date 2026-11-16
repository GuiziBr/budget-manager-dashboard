// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import { InstallmentPlanDialog } from "./InstallmentPlanDialog"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const group = {
	id: "g1",
	description: "Car finance",
	amountPerInstallment: 450,
	totalInstallments: 6,
	paymentIntervalDays: 30,
	firstPurchasedAt: "2026-09-10",
	createdAt: "",
	updatedAt: "",
	deletedAt: null
}

const installment = {
	number: 3,
	total: 6,
	paymentIntervalDays: 30,
	firstPurchasedAt: "2026-09-10T00:00:00.000Z"
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] })
	vi.setSystemTime(new Date("2026-11-15T12:00:00Z"))
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
	vi.clearAllMocks()
})

function setup(
	props: Partial<Parameters<typeof InstallmentPlanDialog>[0]> = {}
) {
	const get = vi.spyOn(api, "get").mockResolvedValue(group as never)
	const patch = vi.spyOn(api, "patch").mockResolvedValue(group as never)
	const onOpenChange = vi.fn()
	const { wrapper } = createQueryWrapper()
	render(
		<InstallmentPlanDialog
			open
			onOpenChange={onOpenChange}
			planId="g1"
			description="Car finance"
			installment={installment}
			canEdit
			{...props}
		/>,
		{ wrapper }
	)
	return { get, patch, onOpenChange, user: userEvent.setup() }
}

const type = async (user: ReturnType<typeof userEvent.setup>, digits: string) =>
	user.type(await screen.findByLabelText(/New amount per payment/), digits)

describe("InstallmentPlanDialog", () => {
	it("shows the plan with the amount per payment read from the group", async () => {
		const { get } = setup()
		expect(await screen.findByText("CAD 450.00")).toBeInTheDocument()
		expect(get).toHaveBeenCalledWith("installment-groups/g1")
		expect(screen.getByText("3 of 6")).toBeInTheDocument()
		expect(screen.getByText("Every 30 days")).toBeInTheDocument()
	})

	it("doesn't read the plan while closed", () => {
		const { get } = setup({ open: false })
		expect(get).not.toHaveBeenCalled()
	})

	it("changes the amount after a confirmation naming the current month", async () => {
		const { patch, user, onOpenChange } = setup()
		await user.click(
			await screen.findByRole("button", { name: "Change amount" })
		)
		await type(user, "12050")
		await user.click(screen.getByRole("button", { name: "Review" }))
		expect(
			screen.getByText(
				"Payments in November 2026 and later will change to CAD 120.50. Earlier payments keep their amount."
			)
		).toBeInTheDocument()
		expect(patch).not.toHaveBeenCalled()
		await user.click(screen.getByRole("button", { name: "Save" }))
		await vi.waitFor(() =>
			expect(patch).toHaveBeenCalledWith("installment-groups/g1", {
				amountPerInstallment: 120.5
			})
		)
		await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
		expect(toast.success).toHaveBeenCalledWith("Car finance plan updated")
	})

	it("blocks an empty amount without sending anything", async () => {
		const { patch, user } = setup()
		await user.click(
			await screen.findByRole("button", { name: "Change amount" })
		)
		await user.click(screen.getByRole("button", { name: "Review" }))
		expect(screen.getByLabelText(/New amount per payment/)).toHaveAttribute(
			"aria-invalid",
			"true"
		)
		expect(patch).not.toHaveBeenCalled()
	})

	it("blocks an amount over the limit", async () => {
		const { user } = setup()
		await user.click(
			await screen.findByRole("button", { name: "Change amount" })
		)
		await type(user, "1000000000000")
		await user.click(screen.getByRole("button", { name: "Review" }))
		expect(screen.getByText("The amount is too large.")).toBeInTheDocument()
	})

	it("keeps the dialog open and toasts when saving fails", async () => {
		const { patch, user, onOpenChange } = setup()
		patch.mockRejectedValue(new ApiError("boom", 500))
		await user.click(
			await screen.findByRole("button", { name: "Change amount" })
		)
		await type(user, "5000")
		await user.click(screen.getByRole("button", { name: "Review" }))
		await user.click(screen.getByRole("button", { name: "Save" }))
		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Something went wrong. Try again.",
				expect.anything()
			)
		)
		expect(onOpenChange).not.toHaveBeenCalled()
		expect(screen.getByRole("button", { name: "Save" })).toBeEnabled()
	})

	it("says the plan is gone on a 404", async () => {
		const { patch, user } = setup()
		patch.mockRejectedValue(new ApiError("nope", 404))
		await user.click(
			await screen.findByRole("button", { name: "Change amount" })
		)
		await type(user, "5000")
		await user.click(screen.getByRole("button", { name: "Review" }))
		await user.click(screen.getByRole("button", { name: "Save" }))
		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"This plan no longer exists.",
				expect.anything()
			)
		)
	})

	it("offers no change when every payment is in a past month", async () => {
		setup({
			installment: {
				...installment,
				firstPurchasedAt: "2026-01-10T00:00:00.000Z"
			}
		})
		expect(await screen.findByText(/none can change/)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Change amount" })).toBeDisabled()
	})

	it("can't change the amount without edit access", async () => {
		setup({ canEdit: false })
		await screen.findByText("CAD 450.00")
		expect(screen.queryByRole("button", { name: "Change amount" })).toBeNull()
	})

	it("offers a retry when the plan can't be read", async () => {
		const { wrapper } = createQueryWrapper()
		const get = vi
			.spyOn(api, "get")
			.mockRejectedValueOnce(new ApiError("x", 500))
			.mockResolvedValue(group as never)
		render(
			<InstallmentPlanDialog
				open
				onOpenChange={vi.fn()}
				planId="g1"
				description="Car finance"
				installment={installment}
				canEdit
			/>,
			{ wrapper }
		)
		const retry = await screen.findByRole("button", { name: "Retry" })
		await userEvent.click(retry)
		expect(await screen.findByText("CAD 450.00")).toBeInTheDocument()
		expect(get).toHaveBeenCalledTimes(2)
	})
})
