// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Switch } from "./switch"

describe("Switch", () => {
	it("reports a change on click", async () => {
		const onCheckedChange = vi.fn()
		render(<Switch aria-label="Salary" onCheckedChange={onCheckedChange} />)

		await userEvent.click(screen.getByRole("switch", { name: "Salary" }))

		expect(onCheckedChange).toHaveBeenCalledWith(true)
	})

	it("toggles with the keyboard", async () => {
		const onCheckedChange = vi.fn()
		render(<Switch aria-label="Salary" onCheckedChange={onCheckedChange} />)

		await userEvent.tab()
		await userEvent.keyboard(" ")

		expect(onCheckedChange).toHaveBeenCalledWith(true)
	})

	it("exposes its state", () => {
		const { rerender } = render(<Switch aria-label="Salary" checked={false} />)
		expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false")

		rerender(<Switch aria-label="Salary" checked />)

		expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true")
	})

	it("does not change while disabled", async () => {
		const onCheckedChange = vi.fn()
		render(
			<Switch aria-label="Salary" disabled onCheckedChange={onCheckedChange} />
		)

		await userEvent.click(screen.getByRole("switch"))

		expect(onCheckedChange).not.toHaveBeenCalled()
	})
})
