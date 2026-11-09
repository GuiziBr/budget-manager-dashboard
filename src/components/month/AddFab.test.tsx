// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { AddFab } from "./AddFab"

describe("AddFab", () => {
	it("is a labelled button that calls onAdd", async () => {
		const onAdd = vi.fn()
		render(<AddFab onAdd={onAdd} />)
		await userEvent.click(screen.getByRole("button", { name: "Add" }))
		expect(onAdd).toHaveBeenCalledOnce()
	})

	it("does nothing without onAdd", async () => {
		render(<AddFab />)
		await userEvent.click(screen.getByRole("button", { name: "Add" }))
		expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument()
	})
})
