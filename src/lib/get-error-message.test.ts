import { describe, expect, it } from "vitest"
import { getErrorMessage } from "./get-error-message"

describe("getErrorMessage", () => {
	it("returns the error's message when present", () => {
		expect(getErrorMessage(new Error("bank not found"), "fallback")).toBe(
			"bank not found"
		)
	})

	it("returns the fallback when the error has an empty message", () => {
		expect(getErrorMessage(new Error(""), "fallback")).toBe("fallback")
	})

	it("returns the fallback for a non-Error value", () => {
		expect(getErrorMessage("some string", "fallback")).toBe("fallback")
		expect(getErrorMessage(null, "fallback")).toBe("fallback")
		expect(getErrorMessage(undefined, "fallback")).toBe("fallback")
	})
})
