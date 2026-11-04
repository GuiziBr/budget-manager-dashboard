// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it } from "vitest"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card"

describe("Card", () => {
	it("renders its parts with their children", () => {
		render(
			<Card data-testid="card">
				<CardHeader>
					<CardTitle>Envelopes</CardTitle>
				</CardHeader>
				<CardContent>Body</CardContent>
				<CardFooter>Footer</CardFooter>
			</Card>
		)

		expect(screen.getByRole("heading", { name: "Envelopes" })).toBeInTheDocument()
		expect(screen.getByText("Body")).toBeInTheDocument()
		expect(screen.getByText("Footer")).toBeInTheDocument()
		expect(screen.getByTestId("card")).toHaveClass("bg-card", "border-border")
	})

	it("merges a custom className and forwards the ref", () => {
		const ref = createRef<HTMLDivElement>()
		render(
			<Card ref={ref} className="p-4" data-testid="card">
				x
			</Card>
		)

		expect(screen.getByTestId("card")).toHaveClass("p-4", "rounded-xl")
		expect(ref.current).toBe(screen.getByTestId("card"))
	})
})
