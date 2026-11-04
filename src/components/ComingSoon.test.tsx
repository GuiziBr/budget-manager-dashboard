// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ComingSoon } from "./ComingSoon"

describe("ComingSoon", () => {
	it("tells the user the screen is not available yet", () => {
		render(<ComingSoon />)
		expect(screen.getByText("Coming soon")).toBeVisible()
		expect(screen.getByText("This screen is not available yet.")).toBeVisible()
	})
})
