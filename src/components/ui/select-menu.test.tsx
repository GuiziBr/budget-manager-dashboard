// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"
import { Dialog, DialogContent, DialogTitle } from "./dialog"
import { SelectMenu } from "./select-menu"

const options = [
	{ id: "categories", description: "Category" },
	{ id: "banks", description: "Bank" },
	{ id: "stores", name: "Store" }
]

const setup = (value = "", extra: Partial<Parameters<typeof SelectMenu>[0]> = {}) => {
	const onValueChange = vi.fn()
	render(
		<SelectMenu
			options={options}
			value={value}
			onValueChange={onValueChange}
			placeholder="Filter by"
			{...extra}
		/>
	)
	return { onValueChange, user: userEvent.setup() }
}

describe("SelectMenu", () => {
	it("shows the placeholder when nothing is selected", () => {
		setup()

		expect(screen.getByRole("combobox")).toHaveTextContent("Filter by")
	})

	it("shows the label of the selected option", () => {
		setup("banks")

		expect(screen.getByRole("combobox")).toHaveTextContent("Bank")
	})

	it("opens a list of options and reports the chosen value", async () => {
		const { user, onValueChange } = setup()

		await user.click(screen.getByRole("combobox"))
		expect(await screen.findByRole("option", { name: "Category" })).toBeInTheDocument()
		expect(screen.getAllByRole("option")).toHaveLength(3)

		await user.click(screen.getByRole("option", { name: "Bank" }))

		expect(onValueChange).toHaveBeenCalledWith("banks")
	})

	it("uses the name when an option has no description", async () => {
		const { user } = setup()

		await user.click(screen.getByRole("combobox"))

		expect(await screen.findByRole("option", { name: "Store" })).toBeInTheDocument()
	})

	it("does not open while disabled", async () => {
		const { user } = setup("", { disabled: true })

		await user.click(screen.getByRole("combobox"))

		expect(screen.queryByRole("option")).not.toBeInTheDocument()
	})

	it("marks an error", () => {
		setup("", { error: "Required" })

		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true")
	})

	it("shows the error message", () => {
		setup("", { error: "Type is required" })

		expect(screen.getByRole("alert")).toHaveTextContent("Type is required")
	})

	it("passes blur through", async () => {
		const onBlur = vi.fn()
		const { user } = setup("", { onBlur })

		await user.click(screen.getByRole("combobox"))
		await user.keyboard("{Escape}")
		await user.tab()

		expect(onBlur).toHaveBeenCalled()
	})

	it("works inside a modal dialog", async () => {
		const onValueChange = vi.fn()
		const user = userEvent.setup()
		render(
			<Dialog open>
				<DialogContent>
					<DialogTitle>Create</DialogTitle>
					<SelectMenu
						options={options}
						value=""
						onValueChange={onValueChange}
						placeholder="Select category"
					/>
				</DialogContent>
			</Dialog>
		)

		await user.click(screen.getByRole("combobox"))
		await user.click(await screen.findByRole("option", { name: "Bank" }))

		expect(onValueChange).toHaveBeenCalledWith("banks")
	})

	it("points the ref at the trigger so it can be focused", () => {
		const ref = createRef<HTMLButtonElement>()
		render(
			<SelectMenu
				ref={ref}
				options={options}
				value=""
				onValueChange={vi.fn()}
				placeholder="Filter by"
			/>
		)

		expect(ref.current).toBe(screen.getByRole("combobox"))
		ref.current?.focus()
		expect(screen.getByRole("combobox")).toHaveFocus()
	})
})
