// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { LookupItem } from "@/lib/lookup-form"
import { LookupList, type LookupQuery } from "./LookupList"

const item = (name: string, extra: object = {}) =>
	({
		id: name,
		name,
		createdAt: "2022-07-06T00:00:00.000Z",
		updatedAt: "2022-07-06T00:00:00.000Z",
		...extra
	}) as LookupItem

const ok = (data: LookupItem[]): LookupQuery => ({
	data,
	isError: false,
	error: null,
	refetch: vi.fn().mockResolvedValue({ data })
})

const create = vi.fn().mockResolvedValue({})

const bodyRows = () =>
	within(screen.getByRole("table")).getAllByRole("row").slice(1)
const firstCells = () =>
	bodyRows().map((row) => within(row).getAllByRole("cell")[0].textContent)

describe("LookupList", () => {
	it("lists the items alphabetically with their dates", () => {
		render(
			<LookupList
				lookup="bank"
				create={create}
				query={ok([
					item("Transport"),
					item("grocery"),
					item("Hydro", { updatedAt: "2026-03-05T00:00:00.000Z" })
				])}
			/>
		)
		expect(firstCells()).toEqual(["grocery", "Hydro", "Transport"])
		const hydro = within(bodyRows()[1]).getAllByRole("cell")
		expect(hydro[1].textContent).toBe("07/06/2022")
		expect(hydro[2].textContent).toBe("03/05/2026")
		// never updated: no date
		expect(within(bodyRows()[0]).getAllByRole("cell")[2].textContent).toBe("")
	})

	it("has a flag column for categories, marking the ones that use envelopes", () => {
		render(
			<LookupList
				lookup="category"
				create={create}
				query={ok([
					item("Transport", { hasBudgetEnvelope: false }),
					item("Grocery", { hasBudgetEnvelope: true })
				])}
			/>
		)
		expect(
			screen.getByRole("columnheader", { name: /Uses envelopes/ })
		).toBeTruthy()
		const flags = bodyRows().map(
			(row) => within(row).getAllByRole("cell")[1].textContent
		)
		expect(flags).toEqual(["Yes", "No"])
	})

	it("has a flag column for payment types and none for banks and stores", () => {
		const { unmount } = render(
			<LookupList
				lookup="paymentType"
				create={create}
				query={ok([item("Credit", { hasStatement: true })])}
			/>
		)
		expect(
			screen.getByRole("columnheader", { name: /Has statement/ })
		).toBeTruthy()
		unmount()
		render(
			<LookupList lookup="store" create={create} query={ok([item("Costco")])} />
		)
		expect(screen.queryByRole("columnheader", { name: /Requires/ })).toBeNull()
		expect(screen.getAllByRole("columnheader")).toHaveLength(4)
	})

	it("sorts by a column and flips on a second click", async () => {
		render(
			<LookupList
				lookup="bank"
				create={create}
				query={ok([item("A"), item("B"), item("C")])}
			/>
		)
		await userEvent.click(screen.getByRole("button", { name: /Name/ }))
		expect(firstCells()).toEqual(["C", "B", "A"])
		await userEvent.click(screen.getByRole("button", { name: /Name/ }))
		expect(firstCells()).toEqual(["A", "B", "C"])
	})

	it("shows 8 rows per page and pages through the rest", async () => {
		const many = Array.from({ length: 10 }, (_, i) =>
			item(`Item ${i + 1}`.padEnd(8, "_"))
		)
		render(<LookupList lookup="store" create={create} query={ok(many)} />)
		expect(bodyRows()).toHaveLength(8)
		expect(screen.getByText("Showing 1–8 of 10 stores")).toBeTruthy()
		await userEvent.click(screen.getByRole("button", { name: "Page 2" }))
		expect(bodyRows()).toHaveLength(2)
		expect(screen.getByText("Showing 9–10 of 10 stores")).toBeTruthy()
	})

	it("shows skeleton rows while loading", () => {
		render(
			<LookupList
				lookup="store"
				create={create}
				query={{ isError: false, error: null, refetch: vi.fn() }}
			/>
		)
		expect(screen.getByRole("status")).toBeTruthy()
		expect(screen.queryByRole("table")).toBeNull()
	})

	it("shows an error with Retry", async () => {
		const refetch = vi.fn()
		render(
			<LookupList
				lookup="bank"
				create={create}
				query={{ isError: true, error: new Error("x"), refetch }}
			/>
		)
		expect(screen.getByRole("alert").textContent).toContain(
			"Couldn't load the banks"
		)
		await userEvent.click(screen.getByRole("button", { name: "Retry" }))
		expect(refetch).toHaveBeenCalledOnce()
	})

	it("shows the empty state under the add section", () => {
		render(<LookupList lookup="store" create={create} query={ok([])} />)
		expect(screen.getByText("No stores yet")).toBeTruthy()
		expect(screen.getByRole("button", { name: "Save" })).toBeTruthy()
	})

	it("offers Edit and Delete in the row menu", async () => {
		const onEdit = vi.fn()
		const onDelete = vi.fn()
		const nubank = item("Nubank")
		render(
			<LookupList
				lookup="bank"
				create={create}
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
