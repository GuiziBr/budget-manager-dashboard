// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/api"
import type { LookupItem } from "@/lib/lookup-form"
import { LookupAddForm } from "./LookupAddForm"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

afterEach(() => {
	vi.clearAllMocks()
})

const grocery = { id: "1", name: "Grocery" } as LookupItem

function setup(
	props: Partial<React.ComponentProps<typeof LookupAddForm>> = {}
) {
	const create = vi.fn().mockResolvedValue({})
	const reload = vi.fn().mockResolvedValue([grocery])
	render(
		<LookupAddForm
			lookup="category"
			items={[grocery]}
			reload={reload}
			create={create}
			{...props}
		/>
	)
	return { create, reload }
}

const type = (text: string) =>
	userEvent.type(screen.getByRole("textbox", { name: "Name" }), text)
const save = () => userEvent.click(screen.getByRole("button", { name: "Save" }))

describe("LookupAddForm", () => {
	it("sends the trimmed name and the flag, toasts and clears the field", async () => {
		const { create } = setup()
		await type("  Hydro ")
		await userEvent.click(screen.getByRole("checkbox"))
		await save()
		await waitFor(() =>
			expect(create).toHaveBeenCalledWith(
				expect.objectContaining({ name: "Hydro", hasBudgetEnvelope: true })
			)
		)
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Hydro added")
		)
		expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("")
	})

	it("does not send an empty name", async () => {
		const { create } = setup()
		await save()
		expect(create).not.toHaveBeenCalled()
		expect(await screen.findByText("Enter a name")).toBeTruthy()
	})

	it("blocks a duplicate that is still on the re-read list", async () => {
		const { create, reload } = setup()
		await type(" grocery ")
		await save()
		await waitFor(() => expect(toast.error).toHaveBeenCalled())
		expect(reload).toHaveBeenCalled()
		expect(create).not.toHaveBeenCalled()
	})

	it("sends the request when the re-read list no longer has the match", async () => {
		const { create } = setup({ reload: vi.fn().mockResolvedValue([]) })
		await type("Grocery")
		await save()
		await waitFor(() => expect(create).toHaveBeenCalled())
	})

	it("falls back to the loaded list when the re-read fails", async () => {
		const { create } = setup({
			reload: vi.fn().mockRejectedValue(new Error("x"))
		})
		await type("Grocery")
		await save()
		await waitFor(() => expect(toast.error).toHaveBeenCalled())
		expect(create).not.toHaveBeenCalled()
	})

	it("keeps what was typed and toasts when the server answers 409", async () => {
		const { create } = setup({ items: [] })
		create.mockRejectedValue(new ApiError("dup", 409))
		await type("Hydro")
		await save()
		await waitFor(() => expect(toast.error).toHaveBeenCalled())
		expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Hydro")
	})

	it("shows no flag checkbox for banks", () => {
		setup({ lookup: "bank" })
		expect(screen.queryByRole("checkbox")).toBeNull()
	})
})
