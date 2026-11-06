// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { parsePage, useMonthPage } from "./use-month-page"

const nav = vi.hoisted(() => ({
	search: "",
	push: vi.fn(),
	replace: vi.fn()
}))
vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(nav.search),
	useRouter: () => ({ push: nav.push, replace: nav.replace })
}))

beforeEach(() => {
	nav.search = ""
	nav.push.mockClear()
	nav.replace.mockClear()
})

describe("parsePage", () => {
	it("accepts whole numbers from 1", () => {
		expect(parsePage("2")).toBe(2)
		expect(parsePage("30")).toBe(30)
	})

	it("falls back to page 1 for anything else", () => {
		for (const value of [null, "", "0", "-1", "abc", "1.5"]) {
			expect(parsePage(value)).toBe(1)
		}
	})
})

describe("useMonthPage", () => {
	it("reads the page from the address", () => {
		nav.search = "period=2026-11&page=3"
		expect(renderHook(() => useMonthPage()).result.current.page).toBe(3)
	})

	it("keeps the period when changing page, without scrolling", () => {
		nav.search = "period=2026-11"
		renderHook(() => useMonthPage()).result.current.setPage(2)
		expect(nav.push).toHaveBeenCalledWith("?period=2026-11&page=2", {
			scroll: false
		})
	})

	it("drops the param for page 1", () => {
		nav.search = "period=2026-11&page=2"
		renderHook(() => useMonthPage()).result.current.setPage(1)
		expect(nav.push).toHaveBeenCalledWith("?period=2026-11", {
			scroll: false
		})
	})

	it("replaces the address when fixing a missing page", () => {
		nav.search = "period=2026-11&page=9"
		renderHook(() => useMonthPage()).result.current.replacePage(3)
		expect(nav.replace).toHaveBeenCalledWith("?period=2026-11&page=3", {
			scroll: false
		})
		expect(nav.push).not.toHaveBeenCalled()
	})
})
