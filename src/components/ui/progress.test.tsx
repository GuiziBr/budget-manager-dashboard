// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Progress } from "./progress"

const indicator = () =>
	screen.getByRole("progressbar").firstElementChild as HTMLElement

describe("Progress", () => {
	it("exposes the value and an accessible name", () => {
		render(<Progress value={40} aria-label="Groceries: 40 of 100 spent" />)

		const bar = screen.getByRole("progressbar", {
			name: "Groceries: 40 of 100 spent"
		})
		expect(bar).toHaveAttribute("aria-valuenow", "40")
		expect(indicator().style.transform).toBe("translateX(-60%)")
	})

	it("clamps a value above 100 to a full bar", () => {
		render(<Progress value={130} aria-label="Over" />)

		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")
		expect(indicator().style.transform).toBe("translateX(-0%)")
	})

	it("clamps a negative or missing value to empty", () => {
		const { rerender } = render(<Progress value={-5} aria-label="Low" />)
		expect(indicator().style.transform).toBe("translateX(-100%)")

		rerender(<Progress aria-label="Low" />)

		expect(indicator().style.transform).toBe("translateX(-100%)")
	})

	it("uses the accent colour by default and danger on request", () => {
		const { rerender } = render(<Progress value={50} aria-label="Bar" />)
		expect(indicator()).toHaveClass("bg-primary")

		rerender(<Progress value={50} variant="danger" aria-label="Bar" />)

		expect(indicator()).toHaveClass("bg-danger")
		expect(indicator()).not.toHaveClass("bg-primary")
	})
})
