// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import { EnvelopeDetailsPanel } from "./EnvelopeDetailsPanel"

afterEach(() => vi.restoreAllMocks())

const env = (patch: Record<string, unknown> = {}) => ({
	id: "e1",
	budgetPeriodId: "p1",
	categoryId: "c1",
	allocatedAmount: 500,
	spentAmount: 120.5,
	spendUpdatedAt: "2026-11-02T14:00:00.000Z",
	...patch
})

function setup(
	envelope: ReturnType<typeof env>,
	props: Partial<Parameters<typeof EnvelopeDetailsPanel>[0]> = {}
) {
	const get = vi
		.spyOn(api, "get")
		.mockImplementation(((endpoint: string) =>
			Promise.resolve(
				endpoint.includes("categories")
					? [{ id: "c1", name: "Groceries" }]
					: endpoint.startsWith("budget-envelopes/")
						? envelope
						: [envelope]
			)) as never)
	const onClose = vi.fn()
	const { wrapper } = createQueryWrapper()
	render(
		<EnvelopeDetailsPanel
			onClose={onClose}
			periodId="p1"
			month={{ year: 2026, month: 11 }}
			envelopeId="e1"
			canEdit
			{...props}
		/>,
		{ wrapper }
	)
	return { get, onClose, user: userEvent.setup() }
}

const dialog = async () => within(await screen.findByRole("dialog"))

// A shared-link envelope: not in the month's list, so it's read by id (a real UUID, unlike "e1" above)
const FAR_ID = "88888888-8888-4888-8888-888888888888"

describe("EnvelopeDetailsPanel", () => {
	it("shows spent, budget and what is left", async () => {
		setup(env())
		const panel = await dialog()
		expect(
			panel.getByRole("heading", { name: "Groceries" })
		).toBeInTheDocument()
		expect(panel.getAllByText("$120.50").length).toBeGreaterThan(0)
		expect(panel.getAllByText("$500.00").length).toBeGreaterThan(0)
		expect(panel.getByText("$379.50")).toBeInTheDocument()
		expect(panel.getByText("2 Nov 2026")).toBeInTheDocument()
		expect(panel.getByRole("progressbar")).toBeInTheDocument()
		expect(panel.queryByText(/Over by/)).toBeNull()
	})

	it("says by how much an envelope is over budget", async () => {
		setup(env({ spentAmount: 620 }))
		const panel = await dialog()
		expect(panel.getByText("Over by $120.00")).toBeInTheDocument()
		expect(panel.getByText("-$120.00")).toBeInTheDocument()
	})

	it("shows a dash and no bar when the spend is unavailable", async () => {
		setup(env({ spentAmount: null, spendUpdatedAt: null }))
		const panel = await dialog()
		expect(panel.getByText("Spend unavailable right now")).toBeInTheDocument()
		expect(panel.queryByRole("progressbar")).toBeNull()
		expect(panel.queryByText(/Over by/)).toBeNull()
	})

	it("names an envelope whose category was deleted", async () => {
		setup(env({ categoryId: "gone" }))
		expect(
			(await dialog()).getByRole("heading", { name: "(deleted)" })
		).toBeInTheDocument()
	})

	it("offers Delete only when the month can be edited", async () => {
		const onDelete = vi.fn()
		const { user } = setup(env(), { onDelete })
		const panel = await dialog()
		await user.click(panel.getByRole("button", { name: "Delete" }))
		expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }))
	})

	it("has no Delete in a closed month", async () => {
		setup(env(), { canEdit: false })
		expect(
			(await dialog()).queryByRole("button", { name: "Delete" })
		).toBeNull()
	})

	it("closes with the X button", async () => {
		const { user, onClose } = setup(env())
		await user.click((await dialog()).getByRole("button", { name: "Close" }))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it("opens from the list without asking for the envelope by id", async () => {
		const { get } = setup(env())
		await dialog()
		expect(get).not.toHaveBeenCalledWith("budget-envelopes/e1")
	})

	it("reads an envelope that isn't in the month's list by id (a shared link)", async () => {
		const { get } = setup(env(), { envelopeId: FAR_ID })
		const panel = await dialog()
		expect(
			panel.getByRole("heading", { name: "Groceries" })
		).toBeInTheDocument()
		expect(get).toHaveBeenCalledWith(`budget-envelopes/${FAR_ID}`)
	})

	it("stays closed when the envelope can't be found", async () => {
		const { get } = setup(env(), { envelopeId: FAR_ID })
		get.mockImplementation(((endpoint: string) =>
			endpoint.startsWith("budget-envelopes/")
				? Promise.reject(new ApiError("not found", 404))
				: Promise.resolve(
						endpoint.includes("categories")
							? [{ id: "c1", name: "Groceries" }]
							: [env()]
					)) as never)
		await vi.waitFor(() =>
			expect(get).toHaveBeenCalledWith(`budget-envelopes/${FAR_ID}`)
		)
		expect(screen.queryByRole("dialog")).toBeNull()
	})

	it("stays closed, without requesting it, when the linked id isn't a UUID", async () => {
		const { get } = setup(env(), { envelopeId: "..%2Fcategories" })
		await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
		expect(get).not.toHaveBeenCalledWith(
			expect.stringContaining("budget-envelopes/..")
		)
	})
})

describe("EnvelopeDetailsPanel previous and next", () => {
	// Order on the card: over budget first, then as given
	const list = [
		env({ id: "e1", spentAmount: 10 }),
		env({ id: "e2", spentAmount: 900 }),
		env({ id: "e3", spentAmount: 20 })
	]

	function setupList(envelopeId: string, onNavigate = vi.fn()) {
		vi.spyOn(api, "get").mockImplementation(((endpoint: string) =>
			Promise.resolve(
				endpoint.includes("categories")
					? [{ id: "c1", name: "Groceries" }]
					: list
			)) as never)
		const { wrapper } = createQueryWrapper()
		render(
			<EnvelopeDetailsPanel
				onClose={vi.fn()}
				onNavigate={onNavigate}
				periodId="p1"
				month={{ year: 2026, month: 11 }}
				envelopeId={envelopeId}
				canEdit
			/>,
			{ wrapper }
		)
		return { onNavigate, user: userEvent.setup() }
	}

	it("steps in the order of the card, with the place in it", async () => {
		const { onNavigate, user } = setupList("e1")
		const panel = within(await screen.findByRole("dialog"))
		// Over-budget e2 comes first, so e1 is second
		expect(panel.getByText("(2/3)")).toBeInTheDocument()
		await user.click(panel.getByRole("button", { name: "Next category" }))
		expect(onNavigate).toHaveBeenLastCalledWith(
			expect.objectContaining({ id: "e3" })
		)
		await user.click(panel.getByRole("button", { name: "Previous category" }))
		expect(onNavigate).toHaveBeenLastCalledWith(
			expect.objectContaining({ id: "e2" })
		)
	})

	it("disables the arrow at either end", async () => {
		setupList("e2")
		const panel = within(await screen.findByRole("dialog"))
		expect(
			panel.getByRole("button", { name: "Previous category" })
		).toBeDisabled()
		expect(panel.getByRole("button", { name: "Next category" })).toBeEnabled()
	})

	it("steps with the up and down arrow keys", async () => {
		const { onNavigate, user } = setupList("e1")
		await screen.findByRole("dialog")
		await user.keyboard("{ArrowDown}")
		expect(onNavigate).toHaveBeenLastCalledWith(
			expect.objectContaining({ id: "e3" })
		)
		await user.keyboard("{ArrowUp}")
		expect(onNavigate).toHaveBeenLastCalledWith(
			expect.objectContaining({ id: "e2" })
		)
	})

	it("has no arrows when nothing handles them", async () => {
		setup(env())
		const panel = within(await screen.findByRole("dialog"))
		expect(panel.queryByRole("button", { name: "Next category" })).toBeNull()
	})
})
