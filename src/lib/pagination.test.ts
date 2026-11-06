import { describe, expect, it } from "vitest"
import { pageWindow } from "./pagination"

describe("pageWindow", () => {
	it("lists every page when there are few", () => {
		expect(pageWindow(1, 1)).toEqual([1])
		expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5])
		expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
	})

	it("collapses the far end when near the start", () => {
		expect(pageWindow(1, 12)).toEqual([1, 2, "ellipsis", 12])
		expect(pageWindow(3, 12)).toEqual([1, 2, 3, 4, "ellipsis", 12])
	})

	it("collapses both sides in the middle", () => {
		expect(pageWindow(6, 12)).toEqual([1, "ellipsis", 5, 6, 7, "ellipsis", 12])
	})

	it("collapses the near end when near the finish", () => {
		expect(pageWindow(12, 12)).toEqual([1, "ellipsis", 11, 12])
		expect(pageWindow(10, 12)).toEqual([1, "ellipsis", 9, 10, 11, 12])
	})

	it("shows a single hidden page instead of an ellipsis", () => {
		expect(pageWindow(4, 9)).toEqual([1, 2, 3, 4, 5, "ellipsis", 9])
		expect(pageWindow(6, 9)).toEqual([1, "ellipsis", 5, 6, 7, 8, 9])
	})

	it("widens the window with more siblings", () => {
		expect(pageWindow(10, 20, 2)).toEqual([
			1,
			"ellipsis",
			8,
			9,
			10,
			11,
			12,
			"ellipsis",
			20
		])
	})
})
