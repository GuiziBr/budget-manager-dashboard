// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Skeleton } from "./skeleton"

describe("Skeleton", () => {
	it("is a pulsing, decorative block", () => {
		render(<Skeleton data-testid="sk" />)

		const el = screen.getByTestId("sk")
		expect(el).toHaveClass("animate-pulse", "bg-muted")
		expect(el).toHaveAttribute("aria-hidden", "true")
	})

	it("merges a custom className", () => {
		render(<Skeleton data-testid="sk" className="h-4 w-24" />)

		expect(screen.getByTestId("sk")).toHaveClass("h-4", "w-24", "rounded-lg")
	})
})
