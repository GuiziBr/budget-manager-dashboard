// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { EditModal } from "./EditModal"

function setup(props: Partial<React.ComponentProps<typeof EditModal>> = {}) {
	const onClose = vi.fn()
	const onSubmit = vi.fn()
	render(
		<EditModal
			isOpen
			onClose={onClose}
			onSubmit={onSubmit}
			title="Edit Bank"
			initialValue="Nubank"
			placeholder="Bank name"
			{...props}
		/>
	)
	return { onClose, onSubmit, user: userEvent.setup() }
}

describe("EditModal", () => {
	it("renders nothing when closed", () => {
		setup({ isOpen: false })

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	})

	it("shows the title and pre-fills the initial value", () => {
		setup()

		expect(screen.getByRole("dialog", { name: "Edit Bank" })).toBeVisible()
		expect(screen.getByPlaceholderText("Bank name")).toHaveValue("Nubank")
	})

	it("disables save until the value changes", async () => {
		const { user } = setup()
		const save = screen.getByRole("button", { name: /save/i })

		expect(save).toBeDisabled()

		await user.type(screen.getByPlaceholderText("Bank name"), "x")

		expect(save).toBeEnabled()
	})

	it("disables save when the value is blank", async () => {
		const { user } = setup()

		await user.clear(screen.getByPlaceholderText("Bank name"))

		expect(screen.getByRole("button", { name: /save/i })).toBeDisabled()
	})

	it("submits the trimmed value", async () => {
		const { user, onSubmit } = setup()
		const input = screen.getByPlaceholderText("Bank name")

		await user.clear(input)
		await user.type(input, "  Inter  ")
		await user.click(screen.getByRole("button", { name: /save/i }))

		expect(onSubmit).toHaveBeenCalledWith("Inter")
	})

	it("does not submit an unchanged value when pressing enter", async () => {
		const { user, onSubmit } = setup()

		await user.type(screen.getByPlaceholderText("Bank name"), "{Enter}")

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it("calls onClose when cancelling", async () => {
		const { user, onClose } = setup()

		await user.click(screen.getByRole("button", { name: "Cancel" }))

		expect(onClose).toHaveBeenCalled()
	})

	it("disables the actions while pending", () => {
		setup({ isPending: true })

		expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
		expect(screen.getByRole("button", { name: "" })).toBeDisabled()
	})

	it("resets the value to the initial one when reopened", async () => {
		const onClose = vi.fn()
		const onSubmit = vi.fn()
		const props = {
			onClose,
			onSubmit,
			title: "Edit Bank",
			initialValue: "Nubank",
			placeholder: "Bank name"
		}
		const user = userEvent.setup()
		const { rerender } = render(<EditModal isOpen {...props} />)

		await user.type(screen.getByPlaceholderText("Bank name"), "123")
		rerender(<EditModal isOpen={false} {...props} />)
		rerender(<EditModal isOpen {...props} />)

		expect(screen.getByPlaceholderText("Bank name")).toHaveValue("Nubank")
	})
})
