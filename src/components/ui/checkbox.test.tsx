// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Checkbox } from "./checkbox"

describe("Checkbox", () => {
	it("reports a change on click", async () => {
		const onCheckedChange = vi.fn()
		render(<Checkbox aria-label="Paid" onCheckedChange={onCheckedChange} />)

		await userEvent.click(screen.getByRole("checkbox", { name: "Paid" }))

		expect(onCheckedChange).toHaveBeenCalledWith(true)
	})

	it("toggles with the keyboard", async () => {
		const onCheckedChange = vi.fn()
		render(<Checkbox aria-label="Paid" onCheckedChange={onCheckedChange} />)

		await userEvent.tab()
		await userEvent.keyboard(" ")

		expect(onCheckedChange).toHaveBeenCalledWith(true)
	})

	it("shows the tick only when checked", () => {
		const { container, rerender } = render(
			<Checkbox aria-label="Paid" checked={false} />
		)
		expect(container.querySelector("svg")).toBeNull()

		rerender(<Checkbox aria-label="Paid" checked />)

		expect(screen.getByRole("checkbox")).toHaveAttribute("data-state", "checked")
		expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
	})

	it("does not change while disabled", async () => {
		const onCheckedChange = vi.fn()
		render(
			<Checkbox aria-label="Paid" disabled onCheckedChange={onCheckedChange} />
		)

		await userEvent.click(screen.getByRole("checkbox"))

		expect(onCheckedChange).not.toHaveBeenCalled()
	})

	it("extends the touch target and merges a custom className", () => {
		render(<Checkbox aria-label="Paid" className="mt-1" />)

		expect(screen.getByRole("checkbox")).toHaveClass(
			"before:-inset-3",
			"lg:before:-inset-1",
			"mt-1"
		)
	})
})
