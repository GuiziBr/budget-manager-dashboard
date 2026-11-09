import { describe, expect, it } from "vitest"
import {
	clampOffset,
	FAB_MARGIN,
	nearestSide,
	parseOffset,
	sideOffset,
	snapToSide
} from "./fab-position"

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

	it("keeps the button above a minimum bottom offset", () => {
		expect(clampOffset({ right: 16, bottom: 10 }, viewport, 88)).toEqual({
			right: 16,
			bottom: 88
		})
		expect(clampOffset({ right: 16, bottom: 300 }, viewport, 88).bottom).toBe(
			300
		)
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

describe("sides", () => {
	it("gives the offset for each side", () => {
		expect(sideOffset("right", 390)).toBe(16)
		expect(sideOffset("left", 390)).toBe(390 - 56 - 16)
		expect(sideOffset("left", 40)).toBe(16)
	})

	it("finds the closest side from the button's centre", () => {
		expect(nearestSide({ right: 16, bottom: 100 }, 390)).toBe("right")
		expect(nearestSide({ right: 300, bottom: 100 }, 390)).toBe("left")
		// Centre at 195 exactly is the right side
		expect(nearestSide({ right: 195 - 28, bottom: 100 }, 390)).toBe("right")
	})

	it("snaps sideways and keeps the height", () => {
		expect(snapToSide({ right: 250, bottom: 321 }, 390)).toEqual({
			right: 318,
			bottom: 321
		})
		expect(snapToSide({ right: 120, bottom: 321 }, 390)).toEqual({
			right: 16,
			bottom: 321
		})
	})
})
