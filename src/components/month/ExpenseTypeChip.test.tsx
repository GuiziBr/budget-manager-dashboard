// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { MonthRow } from "@/lib/month-rows"
import { ExpenseTypeChip } from "./ExpenseTypeChip"

function makeRow(overrides: Partial<MonthRow>): MonthRow {
	return {
		type: "installment",
		installment: {
			number: 2,
			total: 5,
			firstPurchasedAt: "2026-01-01"
		},
		monthsRunning: null,
		unpaid: true,
		...overrides
	} as unknown as MonthRow
}

describe("ExpenseTypeChip", () => {
	it("renders nothing for a one-time expense", () => {
		const { container } = render(
			<ExpenseTypeChip row={makeRow({ type: "one-time", installment: null })} />
		)
		expect(container).toBeEmptyDOMElement()
	})

	it("keeps the primary text colour on unpaid rows", () => {
		render(<ExpenseTypeChip row={makeRow({ unpaid: true })} />)
		const chip = screen.getByText("2/5")
		expect(chip.className).toContain("text-primary-text")
		expect(chip.className).not.toContain("text-foreground")
	})

	it("uses the foreground colour on paid rows, which are dimmed", () => {
		render(<ExpenseTypeChip row={makeRow({ unpaid: false })} />)
		expect(screen.getByText("2/5").className).toContain("text-foreground")
	})

	it("uses the foreground colour on paid recurring rows", () => {
		render(
			<ExpenseTypeChip
				row={makeRow({
					type: "recurring",
					installment: null,
					monthsRunning: 11,
					unpaid: false
				})}
				size="small"
			/>
		)
		expect(screen.getByText("11").className).toContain("text-foreground")
	})
})
