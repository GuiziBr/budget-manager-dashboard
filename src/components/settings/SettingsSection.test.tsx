// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import type { SettingsSectionId } from "@/lib/navigation"
import { createQueryWrapper } from "@/test/query-wrapper"
import { SettingsSection } from "./SettingsSection"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/hooks/use-media-query", () => ({
	PHONE_QUERY: "phone",
	useMediaQuery: () => false
}))

afterEach(() => {
	vi.restoreAllMocks()
	vi.mocked(toast.success).mockClear()
	vi.mocked(toast.error).mockClear()
})

describe("SettingsSection", () => {
	it("links back to the settings list", () => {
		vi.spyOn(api, "get").mockResolvedValue([])
		const { wrapper } = createQueryWrapper()
		render(<SettingsSection section="banks" />, { wrapper })
		expect(
			screen.getByRole("link", { name: "Back to Management" })
		).toHaveAttribute("href", "/management")
	})

	it.each([
		["categories", "categories", "Categories"],
		["payment-types", "payment-types", "Payment types"],
		["banks", "banks", "Banks"],
		["stores", "stores", "Stores"]
	] as [SettingsSectionId, string, string][])(
		"loads %s from the API and lists them",
		async (section, path, title) => {
			const get = vi
				.spyOn(api, "get")
				.mockResolvedValue([
					{ id: "1", name: "Alpha", createdAt: "2022-07-06" }
				])
			const { wrapper } = createQueryWrapper()
			render(<SettingsSection section={section} />, { wrapper })
			await waitFor(() => expect(screen.getByText("Alpha")).toBeTruthy())
			expect(get).toHaveBeenCalledWith(path)
			expect(screen.getByRole("table", { name: title })).toBeTruthy()
		}
	)

	it.each([
		["categories", "categories/1", "Edit category"],
		["payment-types", "payment-types/1", "Edit payment type"],
		["banks", "banks/1", "Edit bank"],
		["stores", "stores/1", "Edit store"]
	] as [SettingsSectionId, string, string][])(
		"renames an item of %s from the edit panel",
		async (section, path, title) => {
			vi.spyOn(api, "get").mockResolvedValue([
				{
					id: "1",
					name: "Alpha",
					createdAt: "2022-07-06",
					hasBudgetEnvelope: false,
					hasStatement: false
				}
			])
			const patch = vi.spyOn(api, "patch").mockResolvedValue({})
			const { wrapper } = createQueryWrapper()
			render(<SettingsSection section={section} />, { wrapper })
			await userEvent.click(
				await screen.findByRole("button", { name: "Actions for Alpha" })
			)
			await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
			expect(await screen.findByText(title)).toBeTruthy()
			const field = screen.getByRole("textbox", { name: /Name/ })
			await userEvent.clear(field)
			await userEvent.type(field, "Beta")
			await userEvent.click(screen.getByRole("button", { name: "Save" }))
			await waitFor(() =>
				expect(patch).toHaveBeenCalledWith(path, { name: "Beta" })
			)
		}
	)

	describe("delete", () => {
		const item = {
			id: "1",
			name: "Alpha",
			createdAt: "2022-07-06",
			hasBudgetEnvelope: false,
			hasStatement: false
		}

		async function openDelete(section: SettingsSectionId) {
			vi.spyOn(api, "get").mockResolvedValue([item])
			const { wrapper } = createQueryWrapper()
			render(<SettingsSection section={section} />, { wrapper })
			await userEvent.click(
				await screen.findByRole("button", { name: "Actions for Alpha" })
			)
			await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }))
		}
		const confirm = () =>
			userEvent.click(
				within(screen.getByRole("dialog")).getByRole("button", {
					name: "Delete"
				})
			)

		it.each([
			["categories", "categories/1", "category"],
			["payment-types", "payment-types/1", "payment type"],
			["banks", "banks/1", "bank"],
			["stores", "stores/1", "store"]
		] as [SettingsSectionId, string, string][])(
			"asks first, then deletes an item of %s",
			async (section, path, noun) => {
				const del = vi.spyOn(api, "delete").mockResolvedValue(undefined)
				await openDelete(section)
				expect(
					screen.getByText(`Are you sure you want to delete the ${noun} Alpha?`)
				).toBeTruthy()
				expect(del).not.toHaveBeenCalled()
				await confirm()
				await waitFor(() => expect(del).toHaveBeenCalledWith(path))
				await waitFor(() =>
					expect(toast.success).toHaveBeenCalledWith("Alpha deleted")
				)
				expect(screen.queryByRole("dialog")).toBeNull()
			}
		)

		it("leaves the item alone when cancelled", async () => {
			const del = vi.spyOn(api, "delete")
			await openDelete("banks")
			await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
			expect(del).not.toHaveBeenCalled()
			await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
		})

		it.each([
			["categories", "envelope"],
			["banks", "recurring bill, or by an expense in"]
		] as [SettingsSectionId, string][])(
			"says it is in use on a 409 (%s)",
			async (section, fragment) => {
				vi.spyOn(api, "delete").mockRejectedValue(new ApiError("x", 409))
				await openDelete(section)
				await confirm()
				await waitFor(() =>
					expect(toast.error).toHaveBeenCalledWith(
						expect.stringContaining(fragment)
					)
				)
				expect(toast.error).toHaveBeenCalledWith(
					expect.stringContaining("Alpha is still in use")
				)
				expect(screen.queryByRole("dialog")).toBeNull()
			}
		)

		it("counts a 404 as deleted: refreshes without a toast", async () => {
			vi.spyOn(api, "delete").mockRejectedValue(new ApiError("x", 404))
			await openDelete("stores")
			const get = vi.mocked(api.get)
			const before = get.mock.calls.length
			await confirm()
			await waitFor(() => expect(get.mock.calls.length).toBeGreaterThan(before))
			expect(toast.error).not.toHaveBeenCalled()
			expect(toast.success).not.toHaveBeenCalled()
		})

		it("shows the generic message on any other failure", async () => {
			vi.spyOn(api, "delete").mockRejectedValue(new ApiError("x", 500))
			await openDelete("stores")
			await confirm()
			await waitFor(() =>
				expect(toast.error).toHaveBeenCalledWith(
					"Couldn't delete the store. Try again."
				)
			)
		})
	})
})
