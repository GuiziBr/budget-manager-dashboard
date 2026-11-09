// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MONTH_SORT_STORAGE_KEY, useMonthSort } from "./use-month-sort"

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
	nav.search = "period=2026-11"
	nav.push.mockClear()
})

afterEach(() => {
	window.localStorage.clear()
})

const opts = { scroll: false }

describe("useMonthSort", () => {
	it("has no sort by default", () => {
		const { result } = renderHook(() => useMonthSort())
		expect(result.current.sort).toBeNull()
		expect(result.current.indicatorFor("due")).toBe("")
	})

	it("reads the sort from the address", () => {
		nav.search = "period=2026-11&sortBy=dueAt&sortOrder=desc"
		const { result } = renderHook(() => useMonthSort())
		expect(result.current.sort).toEqual({ column: "due", order: "desc" })
		expect(result.current.indicatorFor("due")).toBe("↓")
		expect(result.current.indicatorFor("item")).toBe("")
	})

	it("falls back to the default for an invalid address", () => {
		nav.search = "period=2026-11&sortBy=createdAt&sortOrder=asc"
		expect(renderHook(() => useMonthSort()).result.current.sort).toBeNull()
	})

	it("uses the remembered sort when the address has none", () => {
		window.localStorage.setItem(MONTH_SORT_STORAGE_KEY, "amount:asc")
		const { result } = renderHook(() => useMonthSort())
		expect(result.current.sort).toEqual({ column: "amount", order: "asc" })
	})

	it("lets the address win over the remembered sort", () => {
		window.localStorage.setItem(MONTH_SORT_STORAGE_KEY, "amount:asc")
		nav.search = "period=2026-11&sortBy=description&sortOrder=desc"
		const { result } = renderHook(() => useMonthSort())
		expect(result.current.sort).toEqual({ column: "item", order: "desc" })
	})

	it("ignores a junk remembered value", () => {
		window.localStorage.setItem(MONTH_SORT_STORAGE_KEY, "nonsense")
		expect(renderHook(() => useMonthSort()).result.current.sort).toBeNull()
	})

	it("sorts ascending on the first click, back to page 1, keeping the period", () => {
		nav.search = "period=2026-11&page=3"
		const { result } = renderHook(() => useMonthSort())
		act(() => result.current.toggleSort("due"))
		expect(nav.push).toHaveBeenCalledWith(
			"?period=2026-11&sortBy=dueAt&sortOrder=asc",
			opts
		)
		expect(window.localStorage.getItem(MONTH_SORT_STORAGE_KEY)).toBe(
			"dueAt:asc"
		)
	})

	it("goes descending on the second click", () => {
		nav.search = "period=2026-11&sortBy=dueAt&sortOrder=asc"
		const { result } = renderHook(() => useMonthSort())
		act(() => result.current.toggleSort("due"))
		expect(nav.push).toHaveBeenCalledWith(
			"?period=2026-11&sortBy=dueAt&sortOrder=desc",
			opts
		)
	})

	it("restores the default on the third click and forgets the sort", () => {
		window.localStorage.setItem(MONTH_SORT_STORAGE_KEY, "dueAt:desc")
		nav.search = "period=2026-11&page=2&sortBy=dueAt&sortOrder=desc"
		const { result } = renderHook(() => useMonthSort())
		act(() => result.current.toggleSort("due"))
		expect(nav.push).toHaveBeenCalledWith("?period=2026-11", opts)
		expect(window.localStorage.getItem(MONTH_SORT_STORAGE_KEY)).toBeNull()
	})

	it("starts another column ascending", () => {
		nav.search = "period=2026-11&sortBy=dueAt&sortOrder=desc"
		const { result } = renderHook(() => useMonthSort())
		act(() => result.current.toggleSort("amount"))
		expect(nav.push).toHaveBeenCalledWith(
			"?period=2026-11&sortBy=amount&sortOrder=asc",
			opts
		)
	})
})
