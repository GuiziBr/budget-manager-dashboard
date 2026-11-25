// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
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
})
