// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SortableHeader, type SortIndicator } from "./SortableHeader"

const setup = (indicator: SortIndicator) => {
	const onSort = vi.fn()
	render(
		<table>
			<thead>
				<tr>
					<SortableHeader
						column="name"
						label="Name"
						indicator={indicator}
						onSort={onSort}
					/>
				</tr>
			</thead>
		</table>
	)
	return onSort
}

describe("SortableHeader", () => {
	it.each([
		["", "none"],
		["↑", "ascending"],
		["↓", "descending"]
	] as const)(
		"exposes aria-sort for the %s indicator",
		(indicator, expected) => {
			setup(indicator)

			expect(screen.getByRole("columnheader")).toHaveAttribute(
				"aria-sort",
				expected
			)
		}
	)

	it("sorts by its column when clicked", async () => {
		const onSort = setup("")

		await userEvent.click(screen.getByRole("button", { name: "Name" }))

		expect(onSort).toHaveBeenCalledWith("name")
	})
})
