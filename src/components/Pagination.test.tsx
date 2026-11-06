// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Pagination } from "./Pagination"

const pagesOf = (count: number) =>
	Array.from({ length: count }, (_, i) => i + 1)

const setup = (currentPage: number, total: number, summary?: string) => {
	const setCurrentPage = vi.fn()
	render(
		<Pagination
			currentPage={currentPage}
			setCurrentPage={setCurrentPage}
			pages={pagesOf(total)}
			summary={summary}
		/>
	)
	return setCurrentPage
}

const button = (name: string) => screen.getByRole("button", { name })

describe("Pagination", () => {
	it("renders nothing for a single page without a summary", () => {
		const { container } = render(
			<Pagination currentPage={1} setCurrentPage={vi.fn()} pages={pagesOf(1)} />
		)

		expect(container).toBeEmptyDOMElement()
	})

	it("keeps only the count, desktop only, for a single page", () => {
		setup(1, 1, "Showing 1–3 of 3 expenses")

		expect(screen.queryByRole("navigation")).toBeNull()
		expect(screen.queryByRole("button")).toBeNull()
		expect(
			screen.getByText("Showing 1–3 of 3 expenses").parentElement
		).toHaveClass("hidden", "lg:flex")
	})

	it("shows the summary and the current page of the total", () => {
		setup(3, 12, "Showing 21–30 of 115 expenses")

		expect(
			screen.getByText("Showing 21–30 of 115 expenses")
		).toBeInTheDocument()
		expect(screen.getByText(/^Page 3/)).toHaveTextContent("Page 3 of 12")
	})

	it("marks the current page and goes to a numbered page", () => {
		const setCurrentPage = setup(2, 5)

		expect(button("Page 2")).toHaveAttribute("aria-current", "page")
		expect(button("Page 3")).not.toHaveAttribute("aria-current")
		fireEvent.click(button("Page 4"))

		expect(setCurrentPage).toHaveBeenCalledWith(4)
	})

	it("collapses far pages into ellipses", () => {
		setup(6, 12)

		expect(screen.getAllByText("…")).toHaveLength(2)
		expect(button("Page 1")).toBeInTheDocument()
		expect(button("Page 12")).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Page 9" })).toBeNull()
	})

	it("steps to the previous and next page", () => {
		const setCurrentPage = setup(5, 12)

		fireEvent.click(button("Previous page"))
		fireEvent.click(button("Next page"))

		expect(setCurrentPage.mock.calls).toEqual([[4], [6]])
	})

	it("disables previous on the first page", () => {
		setup(1, 5)

		expect(button("Previous page")).toBeDisabled()
		expect(button("Next page")).toBeEnabled()
	})

	it("disables next on the last page", () => {
		setup(5, 5)

		expect(button("Next page")).toBeDisabled()
		expect(button("Previous page")).toBeEnabled()
	})

	it("sits in the card flow instead of floating over the page", () => {
		setup(1, 3)
		const nav = screen.getByRole("navigation", { name: "Pagination" })

		expect(nav).not.toHaveClass("fixed", "lg:fixed")
		expect(nav).toHaveClass("border-t")
	})
})
