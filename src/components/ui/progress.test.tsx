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

	it("clamps a negative value to empty", () => {
		render(<Progress value={-5} aria-label="Low" />)

		expect(indicator().style.transform).toBe("translateX(-100%)")
	})

	it("treats a null or missing value as indeterminate, not zero", () => {
		const { rerender } = render(<Progress value={null} aria-label="Loading" />)
		expect(screen.getByRole("progressbar")).toHaveAttribute(
			"data-state",
			"indeterminate"
		)
		expect(indicator().style.transform).toBe("")

		rerender(<Progress aria-label="Loading" />)

		expect(screen.getByRole("progressbar")).toHaveAttribute(
			"data-state",
			"indeterminate"
		)
		expect(indicator().style.transform).toBe("")
	})

	it("scales the indicator by a custom max", () => {
		render(<Progress value={50} max={200} aria-label="Quarter" />)

		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "200")
		expect(indicator().style.transform).toBe("translateX(-75%)")
	})

	it("clamps a value above a custom max to a full bar", () => {
		render(<Progress value={999} max={200} aria-label="Over" />)

		expect(indicator().style.transform).toBe("translateX(-0%)")
	})

	it("uses the accent colour by default and danger on request", () => {
		const { rerender } = render(<Progress value={50} aria-label="Bar" />)
		expect(indicator()).toHaveClass("bg-primary")

		rerender(<Progress value={50} variant="danger" aria-label="Bar" />)

		expect(indicator()).toHaveClass("bg-danger")
		expect(indicator()).not.toHaveClass("bg-primary")
	})
})
