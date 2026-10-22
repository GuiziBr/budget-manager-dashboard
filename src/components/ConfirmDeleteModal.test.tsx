// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { translations } from "@/constants/translations"
import { ConfirmDeleteModal } from "./ConfirmDeleteModal"

function setup(
	props: Partial<React.ComponentProps<typeof ConfirmDeleteModal>> = {}
) {
	const onClose = vi.fn()
	const onConfirm = vi.fn()
	render(
		<ConfirmDeleteModal
			isOpen
			onClose={onClose}
			onConfirm={onConfirm}
			title="Delete Bank"
			description="Are you sure?"
			resourceName="Nubank"
			{...props}
		/>
	)
	return { onClose, onConfirm, user: userEvent.setup() }
}

describe("ConfirmDeleteModal", () => {
	it("renders nothing when closed", () => {
		setup({ isOpen: false })

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	})

	it("shows the title, description and resource name", () => {
		setup()

		expect(screen.getByRole("dialog", { name: "Delete Bank" })).toBeVisible()
		expect(screen.getByText("Are you sure?")).toBeVisible()
		expect(screen.getByText(/Nubank/)).toBeVisible()
	})

	it("omits the resource name when none is given", () => {
		setup({ resourceName: null })

		expect(screen.queryByText(/Nubank/)).not.toBeInTheDocument()
	})

	it("confirms when clicking delete", async () => {
		const { user, onConfirm } = setup()

		await user.click(
			screen.getByRole("button", { name: translations.common.delete })
		)

		expect(onConfirm).toHaveBeenCalledTimes(1)
	})

	it("closes when clicking cancel", async () => {
		const { user, onClose, onConfirm } = setup()

		await user.click(screen.getByRole("button", { name: "Cancel" }))

		expect(onClose).toHaveBeenCalled()
		expect(onConfirm).not.toHaveBeenCalled()
	})

	it("disables both actions while pending", () => {
		setup({ isPending: true })

		expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
		expect(
			screen.queryByRole("button", { name: translations.common.delete })
		).not.toBeInTheDocument()
	})
})
