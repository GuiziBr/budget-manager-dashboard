// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Badge } from "./badge"

describe("Badge", () => {
	it.each([
		["default", "bg-background", "text-muted-foreground"],
		["primary", "bg-primary-soft", "text-primary-text"],
		["success", "bg-success-soft", "text-success"],
		["danger", "bg-danger-soft", "text-danger"]
	] as const)("renders the %s variant with its tokens", (variant, bg, text) => {
		render(<Badge variant={variant}>Chip</Badge>)

		expect(screen.getByText("Chip")).toHaveClass(bg, text, "rounded-full")
	})

	it("uses the default variant when none is given", () => {
		render(<Badge>Chip</Badge>)

		expect(screen.getByText("Chip")).toHaveClass("bg-background")
	})

	it("lets a custom className win", () => {
		render(<Badge className="px-4">Chip</Badge>)

		expect(screen.getByText("Chip")).toHaveClass("px-4")
		expect(screen.getByText("Chip")).not.toHaveClass("px-2.5")
	})

	it("renders the child element with asChild", () => {
		render(
			<Badge asChild variant="danger">
				<button type="button">Overdue</button>
			</Badge>
		)

		expect(screen.getByRole("button", { name: "Overdue" })).toHaveClass(
			"bg-danger-soft"
		)
	})
})
