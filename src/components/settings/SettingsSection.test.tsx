// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import type { SettingsSectionId } from "@/lib/navigation"
import { createQueryWrapper } from "@/test/query-wrapper"
import { SettingsSection } from "./SettingsSection"

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
				.mockResolvedValue([{ id: "1", name: "Alpha" }])
			const { wrapper } = createQueryWrapper()
			render(<SettingsSection section={section} />, { wrapper })
			await waitFor(() => expect(screen.getByText("Alpha")).toBeTruthy())
			expect(get).toHaveBeenCalledWith(path)
			expect(screen.getByRole("list", { name: title })).toBeTruthy()
		}
	)
})
