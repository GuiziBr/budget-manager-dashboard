// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/api"
import type { LookupItem } from "@/lib/lookup-form"
import { LookupFormPanel } from "./LookupFormPanel"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast }))
vi.mock("@/hooks/use-media-query", () => ({
	PHONE_QUERY: "phone",
	useMediaQuery: () => false
}))

afterEach(() => {
	vi.clearAllMocks()
})

const grocery = {
	id: "1",
	name: "Grocery",
	hasBudgetEnvelope: true
} as LookupItem
const hydro = { id: "2", name: "Hydro", hasBudgetEnvelope: false } as LookupItem

function setup(
	props: Partial<React.ComponentProps<typeof LookupFormPanel>> = {}
) {
	const update = vi.fn().mockResolvedValue({})
	const reload = vi.fn().mockResolvedValue([grocery, hydro])
	const onClose = vi.fn()
	render(
		<LookupFormPanel
			open
			onClose={onClose}
			lookup="category"
			item={hydro}
			items={[grocery, hydro]}
			reload={reload}
			update={update}
			{...props}
		/>
	)
	return { update, reload, onClose }
}

const name = () => screen.getByRole("textbox", { name: /Name/ })
const retype = async (text: string) => {
	await userEvent.clear(name())
	if (text) await userEvent.type(name(), text)
}
const save = () => userEvent.click(screen.getByRole("button", { name: "Save" }))

describe("LookupFormPanel", () => {
	it("is titled and prefilled with the item", () => {
		setup()
		expect(screen.getByText("Edit category")).toBeInTheDocument()
		expect(name()).toHaveValue("Hydro")
	})

	it("sends only the changed name, toasts and closes", async () => {
		const { update, onClose } = setup()
		await retype("  Electricity ")
		await save()
		await waitFor(() =>
			expect(update).toHaveBeenCalledWith(hydro, { name: "Electricity" })
		)
		expect(toast.success).toHaveBeenCalledWith("Electricity saved")
		expect(onClose).toHaveBeenCalled()
	})

	describe("Uses envelopes flag", () => {
		const flag = () => screen.getByRole("checkbox", { name: "Uses envelopes" })

		it("shows the flag prefilled, with its hint", () => {
			setup({ item: grocery })
			expect(flag()).toBeChecked()
			expect(
				screen.getByText(/Existing envelopes don't change/)
			).toBeInTheDocument()
		})

		it("keeps its ids apart from the add card's, which shares the page", () => {
			render(
				<>
					<div id="lookup-flag" />
					<div id="lookup-flag-hint" />
				</>
			)
			setup({ item: grocery })
			expect(flag()).toHaveAccessibleDescription(
				/Existing envelopes don't change/
			)
			expect(flag().id).not.toBe("lookup-flag")
		})

		it("sends only the flag when it is the only change", async () => {
			const { update, reload, onClose } = setup()
			expect(flag()).not.toBeChecked()
			await userEvent.click(flag())
			await save()
			await waitFor(() =>
				expect(update).toHaveBeenCalledWith(hydro, { hasBudgetEnvelope: true })
			)
			// A flag-only save skips the duplicate check
			expect(reload).not.toHaveBeenCalled()
			expect(toast.success).toHaveBeenCalledWith("Hydro saved")
			expect(onClose).toHaveBeenCalled()
		})

		it("sends nothing when the flag is toggled back", async () => {
			const { update, onClose } = setup()
			await userEvent.click(flag())
			await userEvent.click(flag())
			await save()
			await waitFor(() => expect(onClose).toHaveBeenCalled())
			expect(update).not.toHaveBeenCalled()
		})

		it("is not offered for other lookups", () => {
			setup({ lookup: "bank" })
			expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
		})
	})

	it("closes without a request when nothing changed", async () => {
		const { update, reload, onClose } = setup()
		await save()
		await waitFor(() => expect(onClose).toHaveBeenCalled())
		expect(update).not.toHaveBeenCalled()
		expect(reload).not.toHaveBeenCalled()
	})

	it("does not save an empty name", async () => {
		const { update } = setup()
		await retype("")
		await save()
		expect(await screen.findByText("Enter a name")).toBeInTheDocument()
		expect(update).not.toHaveBeenCalled()
	})

	it("blocks a duplicate ignoring case and spaces", async () => {
		const { update } = setup()
		await retype(" grocery ")
		await save()
		await waitFor(() => expect(toast.error).toHaveBeenCalled())
		expect(toast.error).toHaveBeenCalledWith(
			"A category named 'grocery' already exists."
		)
		expect(name()).toHaveAttribute("aria-invalid", "true")
		expect(update).not.toHaveBeenCalled()
	})

	it("sends the request when the match is gone after a reload", async () => {
		const { update, reload } = setup()
		reload.mockResolvedValue([hydro])
		await retype("Grocery")
		await save()
		await waitFor(() => expect(update).toHaveBeenCalled())
		expect(reload).toHaveBeenCalled()
	})

	it("sends the request when the reload fails and the list has no match", async () => {
		const { update, reload } = setup({ items: [hydro] })
		reload.mockRejectedValue(new Error("offline"))
		await retype("Grocery")
		await save()
		await waitFor(() => expect(update).toHaveBeenCalled())
		// No local match, so no reload was needed
		expect(reload).not.toHaveBeenCalled()
	})

	it("blocks when the reload fails but the list shows a match", async () => {
		const { update, reload } = setup()
		reload.mockRejectedValue(new Error("offline"))
		await retype("Grocery")
		await save()
		await waitFor(() => expect(toast.error).toHaveBeenCalled())
		expect(update).not.toHaveBeenCalled()
	})

	it("keeps the form on a 409 and marks the field", async () => {
		const { update, onClose } = setup({ items: [hydro] })
		update.mockRejectedValue(new ApiError("dup", 409))
		await retype("Grocery")
		await save()
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"A category named 'Grocery' already exists."
			)
		)
		expect(name()).toHaveValue("Grocery")
		expect(name()).toHaveAttribute("aria-invalid", "true")
		expect(onClose).not.toHaveBeenCalled()
	})

	it("closes and refreshes the list on a 404", async () => {
		const { update, reload, onClose } = setup()
		update.mockRejectedValue(new ApiError("gone", 404))
		await retype("Electricity")
		await save()
		await waitFor(() => expect(onClose).toHaveBeenCalled())
		expect(toast.error).toHaveBeenCalledWith("This category no longer exists.")
		expect(reload).toHaveBeenCalled()
	})

	it("keeps the form open on any other failure", async () => {
		const { update, onClose } = setup()
		update.mockRejectedValue(new ApiError("boom", 500))
		await retype("Electricity")
		await save()
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Couldn't save the category. Try again."
			)
		)
		expect(name()).toHaveValue("Electricity")
		expect(onClose).not.toHaveBeenCalled()
	})

	it("cannot be cancelled while saving", async () => {
		const { update, onClose } = setup()
		update.mockReturnValue(new Promise(() => {}))
		await retype("Electricity")
		await save()
		await waitFor(() => expect(update).toHaveBeenCalled())
		expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
		await userEvent.keyboard("{Escape}")
		expect(onClose).not.toHaveBeenCalled()
	})

	it("closes on Cancel", async () => {
		const { onClose } = setup()
		await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
		expect(onClose).toHaveBeenCalled()
	})

	it("names the lookup in the title", () => {
		setup({ lookup: "bank", item: { id: "9", name: "Nubank" } as LookupItem })
		expect(screen.getByText("Edit bank")).toBeInTheDocument()
	})
})
