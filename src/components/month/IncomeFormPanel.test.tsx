// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import type { Income } from "@/types"
import { IncomeFormPanel } from "./IncomeFormPanel"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast }))

vi.mock("@/hooks/use-media-query", () => ({
	PHONE_QUERY: "phone",
	useMediaQuery: () => false
}))

const income: Income = {
	id: "i1",
	budgetPeriodId: "p1",
	description: "Salary",
	amount: 6144,
	isSalary: true,
	receivedAt: "2026-11-05T00:00:00.000Z",
	createdAt: "",
	updatedAt: "",
	deletedAt: null
}

beforeEach(() => {
	toast.success.mockClear()
	toast.error.mockClear()
	vi.spyOn(api, "get").mockResolvedValue([] as never)
})

afterEach(() => {
	vi.restoreAllMocks()
})

const setup = (props: { income?: Income; onSaved?: () => void } = {}) => {
	const onClose = vi.fn()
	const { wrapper } = createQueryWrapper()
	render(
		<IncomeFormPanel
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

describe("IncomeFormPanel", () => {
	it("shows an empty form for the month on screen", () => {
		setup()

		expect(
			screen.getByRole("dialog", { name: "Add income" })
		).toHaveTextContent("November 2026")
		expect(screen.getByLabelText("Description")).toHaveValue("")
		expect(screen.getByLabelText("Amount")).toHaveValue("")
		expect(screen.getByRole("switch", { name: /Salary/ })).toHaveAttribute(
			"aria-checked",
			"false"
		)
		expect(screen.getAllByText("*")).toHaveLength(2)
	})

	it("focuses the description", () => {
		setup()
		expect(screen.getByLabelText("Description")).toHaveFocus()
	})

	it("adds an income flagged as salary and closes (M-20)", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue({ id: "i2" } as never)
		const onSaved = vi.fn()
		const { user, onClose } = setup({ onSaved })

		await user.type(screen.getByLabelText("Description"), "Salary")
		await user.type(screen.getByLabelText("Amount"), "614400")
		await user.click(screen.getByRole("switch", { name: /Salary/ }))
		await user.type(screen.getByLabelText("Received"), "2026-11-05")
		await user.click(screen.getByRole("button", { name: "Save" }))

		await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
		expect(post).toHaveBeenCalledWith("incomes", {
			budgetPeriodId: "p1",
			description: "Salary",
			amount: 6144,
			isSalary: true,
			receivedAt: "2026-11-05"
		})
		expect(onSaved).toHaveBeenCalledOnce()
		expect(toast.success).toHaveBeenCalledWith("Salary added to November 2026.")
	})

	it("leaves out the received date when empty", async () => {
		const post = vi.spyOn(api, "post").mockResolvedValue({} as never)
		const { user, onClose } = setup()

		await user.type(screen.getByLabelText("Description"), "Gift")
		await user.type(screen.getByLabelText("Amount"), "5000")
		await user.click(screen.getByRole("button", { name: "Save" }))

		await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
		expect(post).toHaveBeenCalledWith("incomes", {
			budgetPeriodId: "p1",
			description: "Gift",
			amount: 50,
			isSalary: false
		})
	})

	it("marks the invalid fields with red borders and no visible message", async () => {
		const post = vi.spyOn(api, "post")
		const { user, onClose } = setup()

		await user.click(screen.getByRole("button", { name: "Save" }))

		expect(screen.getByLabelText("Description")).toHaveAttribute(
			"aria-invalid",
			"true"
		)
		expect(screen.getByLabelText("Amount")).toHaveAttribute(
			"aria-invalid",
			"true"
		)
		// The reason is for screen readers only
		expect(screen.getByText("Enter a description.")).toHaveClass("sr-only")
		expect(post).not.toHaveBeenCalled()
		expect(onClose).not.toHaveBeenCalled()
	})

	it("keeps what was typed and toasts when the server fails", async () => {
		vi.spyOn(api, "post").mockRejectedValue(new ApiError("boom", 500))
		const { user, onClose } = setup()

		await user.type(screen.getByLabelText("Description"), "Gift")
		await user.type(screen.getByLabelText("Amount"), "5000")
		await user.click(screen.getByRole("button", { name: "Save" }))

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Something went wrong. Try again.",
				expect.anything()
			)
		)
		expect(onClose).not.toHaveBeenCalled()
		expect(screen.getByLabelText("Description")).toHaveValue("Gift")
		expect(screen.getByLabelText("Amount")).toHaveValue("50.00")
	})

	it("Cancel closes without sending anything", async () => {
		const post = vi.spyOn(api, "post")
		const { user, onClose } = setup()

		await user.click(screen.getByRole("button", { name: "Cancel" }))

		expect(onClose).toHaveBeenCalledOnce()
		expect(post).not.toHaveBeenCalled()
	})

	describe("editing", () => {
		it("prefills the income", () => {
			setup({ income })

			expect(
				screen.getByRole("dialog", { name: "Edit income" })
			).toHaveTextContent("November 2026")
			expect(screen.getByLabelText("Description")).toHaveValue("Salary")
			expect(screen.getByLabelText("Amount")).toHaveValue("6,144.00")
			expect(screen.getByRole("switch", { name: /Salary/ })).toHaveAttribute(
				"aria-checked",
				"true"
			)
			expect(screen.getByLabelText("Received")).toHaveValue("2026-11-05")
		})

		it("sends only the changed fields (M-21)", async () => {
			const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never)
			const { user, onClose } = setup({ income })

			await user.clear(screen.getByLabelText("Amount"))
			await user.type(screen.getByLabelText("Amount"), "620000")
			await user.click(screen.getByRole("button", { name: "Save" }))

			await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
			expect(patch).toHaveBeenCalledWith("incomes/i1", { amount: 6200 })
			expect(toast.success).toHaveBeenCalledWith("Salary updated.")
		})

		it("clears the received date with null", async () => {
			const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never)
			const { user, onClose } = setup({ income })

			await user.clear(screen.getByLabelText("Received"))
			await user.click(screen.getByRole("button", { name: "Save" }))

			await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
			expect(patch).toHaveBeenCalledWith("incomes/i1", { receivedAt: null })
		})

		it("closes without a request when nothing changed", async () => {
			const patch = vi.spyOn(api, "patch")
			const { user, onClose } = setup({ income })

			await user.click(screen.getByRole("button", { name: "Save" }))

			await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
			expect(patch).not.toHaveBeenCalled()
		})
	})
})
