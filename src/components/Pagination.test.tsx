// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Pagination } from "./Pagination"

const pagesOf = (count: number) =>
	Array.from({ length: count }, (_, i) => i + 1)

const setup = (currentPage: number, total: number) => {
	const setCurrentPage = vi.fn()
	render(
		<Pagination
			currentPage={currentPage}
			setCurrentPage={setCurrentPage}
			pages={pagesOf(total)}
		/>
	)
	return setCurrentPage
}

const button = (name: string) => screen.getByRole("button", { name })

describe("Pagination", () => {
	it("renders nothing for a single page", () => {
		const { container } = render(
			<Pagination currentPage={1} setCurrentPage={vi.fn()} pages={pagesOf(1)} />
		)

		expect(container).toBeEmptyDOMElement()
	})

	it("shows the current page and the total", () => {
		setup(3, 12)

		expect(screen.getByText(/^Page/)).toHaveTextContent("Page 3 of 12")
	})

	it("goes to the first, previous, next and last page", () => {
		const setCurrentPage = setup(5, 12)

		fireEvent.click(button("First page"))
		fireEvent.click(button("Previous page"))
		fireEvent.click(button("Next page"))
		fireEvent.click(button("Last page"))

		expect(setCurrentPage.mock.calls).toEqual([[1], [4], [6], [12]])
	})

	it("disables first and previous on the first page", () => {
		setup(1, 5)

		expect(button("First page")).toBeDisabled()
		expect(button("Previous page")).toBeDisabled()
		expect(button("Next page")).toBeEnabled()
		expect(button("Last page")).toBeEnabled()
	})

	it("disables next and last on the last page", () => {
		setup(5, 5)

		expect(button("Next page")).toBeDisabled()
		expect(button("Last page")).toBeDisabled()
		expect(button("First page")).toBeEnabled()
		expect(button("Previous page")).toBeEnabled()
	})

	it("is pinned to the viewport bottom on desktop only", () => {
		setup(1, 3)
		const nav = screen.getByRole("navigation", { name: "Pagination" })

		expect(nav).toHaveClass("lg:fixed", "lg:bottom-4")
		expect(nav).not.toHaveClass("fixed")
	})
})
