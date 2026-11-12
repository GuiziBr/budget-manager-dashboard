// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FormField } from "./form-field"

const setup = (props: Partial<Parameters<typeof FormField>[0]> = {}) =>
	render(
		<FormField id="f" label="Name" {...props}>
			<input id="f" />
		</FormField>
	)

describe("FormField", () => {
	it("labels the control and marks a required field with a hidden asterisk", () => {
		setup({ required: true })
		expect(screen.getByLabelText("Name")).toBeInTheDocument()
		expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true")
	})

	it("has no asterisk when not required", () => {
		setup()
		expect(screen.queryByText("*")).toBeNull()
	})

	it("gives the error as an alert the control can point at", () => {
		setup({ error: "Enter a name." })
		expect(screen.getByRole("alert")).toHaveTextContent("Enter a name.")
		expect(screen.getByRole("alert")).toHaveAttribute("id", "f-error")
	})

	it("keeps the message for screen readers only", () => {
		setup({ error: "Enter a name." })
		expect(screen.getByRole("alert")).toHaveClass("sr-only")
	})
})
