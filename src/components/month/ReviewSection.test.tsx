// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { ReviewSection } from "./ReviewSection"

const base = {
	title: "Things",
	isLoading: false,
	isError: false,
	errorTitle: "Couldn't load",
	onRetry: () => {},
	isEmpty: false
}

const toggle = () => screen.getByRole("button", { name: /Things/ })

describe("ReviewSection", () => {
	it("starts hidden when asked and opens by hand", async () => {
		render(
			<ReviewSection {...base} defaultCollapsed>
				rows
			</ReviewSection>
		)
		expect(toggle()).toHaveAttribute("aria-expanded", "false")

		await userEvent.click(toggle())

		expect(toggle()).toHaveAttribute("aria-expanded", "true")
	})

	it("opens when attention is needed, and can be hidden again", async () => {
		const { rerender } = render(
			<ReviewSection {...base} defaultCollapsed>
				rows
			</ReviewSection>
		)

		rerender(
			<ReviewSection {...base} defaultCollapsed attention>
				rows
			</ReviewSection>
		)
		expect(toggle()).toHaveAttribute("aria-expanded", "true")

		await userEvent.click(toggle())
		expect(toggle()).toHaveAttribute("aria-expanded", "false")
	})

	it("opens for a new load error even while attention was already set", async () => {
		const { rerender } = render(
			<ReviewSection {...base} defaultCollapsed attention>
				rows
			</ReviewSection>
		)
		await userEvent.click(toggle())
		expect(toggle()).toHaveAttribute("aria-expanded", "false")

		rerender(
			<ReviewSection {...base} defaultCollapsed attention isError>
				rows
			</ReviewSection>
		)

		expect(toggle()).toHaveAttribute("aria-expanded", "true")
	})

	it("lets the user hide an error that hasn't changed", async () => {
		render(
			<ReviewSection {...base} isError>
				rows
			</ReviewSection>
		)
		await userEvent.click(toggle())

		expect(toggle()).toHaveAttribute("aria-expanded", "false")
	})
})
