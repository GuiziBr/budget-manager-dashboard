// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { LookupItem } from "@/lib/lookup-form"
import { LookupList, type LookupQuery } from "./LookupList"

const item = (name: string, extra: object = {}) =>
	({ id: name, name, ...extra }) as LookupItem

const ok = (data: LookupItem[]): LookupQuery => ({
	data,
	isError: false,
	error: null,
	refetch: vi.fn()
})

describe("LookupList", () => {
	it("lists the items alphabetically and badges the flagged category", () => {
		render(
			<LookupList
				lookup="category"
				query={ok([
					item("Transport", { hasBudgetEnvelope: false }),
					item("Grocery", { hasBudgetEnvelope: true }),
					item("Hydro", { hasBudgetEnvelope: false })
				])}
			/>
		)
		const rows = within(screen.getByRole("list")).getAllByRole("listitem")
		expect(
			rows.map((row) => row.textContent?.replace("Uses envelopes", ""))
		).toEqual(["Grocery", "Hydro", "Transport"])
		expect(screen.getAllByText("Uses envelopes")).toHaveLength(1)
		expect(within(rows[0]).getByText("Uses envelopes")).toBeTruthy()
	})

	it("badges payment types that require a bank", () => {
		render(
			<LookupList
				lookup="paymentType"
				query={ok([
					item("Debit", { hasStatement: false }),
					item("Credit", { hasStatement: true })
				])}
			/>
		)
		expect(screen.getAllByText("Requires a bank")).toHaveLength(1)
	})

	it("shows no badge for banks and stores", () => {
		render(<LookupList lookup="bank" query={ok([item("Nubank")])} />)
		expect(screen.getByText("Nubank")).toBeTruthy()
		expect(screen.queryByText("Uses envelopes")).toBeNull()
		expect(screen.queryByText("Requires a bank")).toBeNull()
	})

	it("shows skeleton rows while loading", () => {
		render(
			<LookupList
				lookup="store"
				query={{ isError: false, error: null, refetch: vi.fn() }}
			/>
		)
		expect(screen.getByRole("status")).toBeTruthy()
		expect(screen.queryByRole("list")).toBeNull()
	})

	it("shows an error with Retry", async () => {
		const refetch = vi.fn()
		render(
			<LookupList
				lookup="bank"
				query={{ isError: true, error: new Error("x"), refetch }}
			/>
		)
		expect(screen.getByRole("alert").textContent).toContain(
			"Couldn't load the banks"
		)
		await userEvent.click(screen.getByRole("button", { name: "Retry" }))
		expect(refetch).toHaveBeenCalledOnce()
	})

	it("shows the empty state with an Add button that calls onAdd", async () => {
		const onAdd = vi.fn()
		render(<LookupList lookup="store" query={ok([])} onAdd={onAdd} />)
		expect(screen.getByText("No stores yet")).toBeTruthy()
		const adds = screen.getAllByRole("button", { name: "Add" })
		expect(adds).toHaveLength(2)
		await userEvent.click(adds[1])
		expect(onAdd).toHaveBeenCalledOnce()
	})

	it("offers Edit and Delete in the row menu", async () => {
		const onEdit = vi.fn()
		const onDelete = vi.fn()
		const nubank = item("Nubank")
		render(
			<LookupList
				lookup="bank"
				query={ok([nubank])}
				onEdit={onEdit}
				onDelete={onDelete}
			/>
		)
		await userEvent.click(
			screen.getByRole("button", { name: "Actions for Nubank" })
		)
		await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
		expect(onEdit).toHaveBeenCalledWith(nubank)
		await userEvent.click(
			screen.getByRole("button", { name: "Actions for Nubank" })
		)
		await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }))
		expect(onDelete).toHaveBeenCalledWith(nubank)
	})
})
