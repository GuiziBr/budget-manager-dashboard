// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AddFabMenu } from "./AddMenu"

beforeEach(() => {
	window.localStorage.clear()
	// jsdom has no pointer capture
	HTMLElement.prototype.setPointerCapture = vi.fn()
})

// A stand-in for the page: choosing Expense moves the focus into a "panel" field, like the form does
function Page() {
	const [open, setOpen] = useState(false)
	return (
		<>
			<AddFabMenu
				open={open}
				onOpenChange={setOpen}
				onAddExpense={() => document.getElementById("panel-field")?.focus()}
			/>
			<input id="panel-field" aria-label="Panel field" />
		</>
	)
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("AddFabMenu focus", () => {
	it("leaves the focus with the panel an entry opens", async () => {
		const user = userEvent.setup()
		render(<Page />)
		await user.click(screen.getByRole("button", { name: "Add" }))
		await user.click(await screen.findByRole("menuitem", { name: /Expense/ }))
		// Radix restores focus in a timer after the menu unmounts
		await wait(50)
		expect(screen.getByLabelText("Panel field")).toHaveFocus()
	})

	it("returns the focus to the button when the menu closes without a choice", async () => {
		const user = userEvent.setup()
		render(<Page />)
		const fab = screen.getByRole("button", { name: "Add" })
		await user.click(fab)
		await screen.findByRole("menuitem", { name: /Expense/ })
		await user.keyboard("{Escape}")
		await wait(50)
		expect(screen.queryByRole("menuitem")).toBeNull()
		expect(fab).toHaveFocus()
	})
})
