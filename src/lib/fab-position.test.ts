import { describe, expect, it } from "vitest"
import { clampOffset, FAB_MARGIN, parseOffset } from "./fab-position"

const viewport = { width: 390, height: 800 }

describe("clampOffset", () => {
	it("leaves a position that fits", () => {
		expect(clampOffset({ right: 16, bottom: 96 }, viewport)).toEqual({
			right: 16,
			bottom: 96
		})
	})

	it("keeps the button inside every edge", () => {
		expect(clampOffset({ right: -50, bottom: -50 }, viewport)).toEqual({
			right: FAB_MARGIN,
			bottom: FAB_MARGIN
		})
		expect(clampOffset({ right: 999, bottom: 999 }, viewport)).toEqual({
			right: 390 - 56 - FAB_MARGIN,
			bottom: 800 - 56 - FAB_MARGIN
		})
	})

	it("doesn't go below the margin in a tiny viewport", () => {
		expect(
			clampOffset({ right: 30, bottom: 30 }, { width: 40, height: 40 })
		).toEqual({ right: FAB_MARGIN, bottom: FAB_MARGIN })
	})
})

describe("parseOffset", () => {
	it("reads a stored position", () => {
		expect(parseOffset('{"right":20,"bottom":120}')).toEqual({
			right: 20,
			bottom: 120
		})
	})

	it.each([
		null,
		"",
		"nope",
		"{}",
		'{"right":"1","bottom":2}',
		'{"right":1}',
		"null"
	])("rejects %s", (raw) => {
		expect(parseOffset(raw)).toBeNull()
	})
})
