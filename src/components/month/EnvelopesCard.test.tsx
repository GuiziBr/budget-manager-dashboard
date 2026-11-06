// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import { EnvelopesCard } from "./EnvelopesCard"

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.restoreAllMocks())

const env = (
	id: string,
	categoryId: string,
	allocatedAmount: number,
	spentAmount: number | null
) => ({ id, categoryId, allocatedAmount, spentAmount })

const categories = [
	{ id: "c1", name: "Groceries" },
	{ id: "c2", name: "Dining" },
	{ id: "c3", name: "Fun" }
]

function mockApi(envelopes: unknown[], cats: unknown[] = categories) {
	vi.spyOn(api, "get").mockImplementation(((endpoint: string) =>
		Promise.resolve(
			endpoint.includes("categories") ? cats : envelopes
		)) as never)
}

const setup = (onSelect?: () => void) => {
	const { wrapper } = createQueryWrapper()
	render(<EnvelopesCard periodId="p1" onSelectEnvelope={onSelect} />, {
		wrapper
	})
}

describe("EnvelopesCard", () => {
	it("shows a loading status first", () => {
		vi.spyOn(api, "get").mockReturnValue(new Promise(() => {}))
		setup()
		expect(screen.getByRole("status")).toHaveTextContent("Loading envelopes")
	})

	it("lists over-budget envelopes first with the pill", async () => {
		mockApi([env("e1", "c1", 500, 100), env("e2", "c2", 200, 250)])
		setup()
		const items = await screen.findAllByRole("listitem")
		expect(items[0]).toHaveTextContent("Dining")
		expect(items[0]).toHaveTextContent("$250.00 / $200.00")
		expect(items[1]).toHaveTextContent("Groceries")
		expect(screen.getByText("1 over budget")).toBeInTheDocument()
	})

	it("shows a dash and no bar when spend is unavailable", async () => {
		mockApi([env("e1", "c1", 500, null)])
		setup()
		const item = await screen.findByRole("listitem")
		expect(item).toHaveTextContent("—")
		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
		expect(screen.queryByText(/over budget/)).not.toBeInTheDocument()
	})

	it("marks a category missing from the lookup as deleted", async () => {
		mockApi([env("e1", "gone", 500, 10)])
		setup()
		expect(await screen.findByText("(deleted)")).toBeInTheDocument()
	})

	it("collapses, keeps the pill, and remembers the choice", async () => {
		mockApi([env("e1", "c2", 200, 250)])
		setup()
		await screen.findByRole("listitem")
		await userEvent.click(screen.getByRole("button", { name: /Hide/ }))
		expect(screen.queryByRole("listitem")).not.toBeInTheDocument()
		expect(screen.getByText("1 over budget")).toBeInTheDocument()
		expect(window.localStorage.getItem("month.envelopes.collapsed")).toBe(
			"true"
		)
		expect(screen.getByRole("button", { name: /Show/ })).toHaveAttribute(
			"aria-expanded",
			"false"
		)
	})

	it("starts collapsed when remembered", async () => {
		window.localStorage.setItem("month.envelopes.collapsed", "true")
		mockApi([env("e1", "c1", 500, 100)])
		setup()
		expect(await screen.findByRole("button", { name: /Show/ })).toBeVisible()
		expect(screen.queryByRole("listitem")).not.toBeInTheDocument()
	})

	it("calls onSelectEnvelope when a tile is clicked", async () => {
		mockApi([env("e1", "c1", 500, 100)])
		const onSelect = vi.fn()
		setup(onSelect)
		await userEvent.click(
			await screen.findByRole("button", { name: /Groceries/ })
		)
		expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }))
	})

	it("renders nothing without envelopes", async () => {
		mockApi([])
		const { wrapper } = createQueryWrapper()
		const { container } = render(<EnvelopesCard periodId="p1" />, { wrapper })
		await vi.waitFor(() =>
			expect(screen.queryByRole("status")).not.toBeInTheDocument()
		)
		expect(container).toBeEmptyDOMElement()
	})

	it("shows an error with Retry", async () => {
		const spy = vi
			.spyOn(api, "get")
			.mockRejectedValue(new ApiError("boom", 500) as never)
		setup()
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Couldn't load the envelopes"
		)
		const calls = spy.mock.calls.length
		await userEvent.click(screen.getByRole("button", { name: "Retry" }))
		await vi.waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(calls))
	})
})
