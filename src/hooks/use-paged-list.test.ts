// @vitest-environment jsdom
import type { UseQueryResult } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { usePagedList } from "./use-paged-list"

type Result = { totalCount: number }

let totalCount: number | undefined
let isPlaceholderData = false
const useList = vi.fn((_params: { offset: number; limit: number }) => ({
	data: totalCount === undefined ? undefined : { totalCount },
	isLoading: totalCount === undefined,
	error: null,
	isPlaceholderData
})) as unknown as (params: {
	offset: number
	limit: number
}) => UseQueryResult<Result>

const setup = () => renderHook(() => usePagedList(useList, 8))

beforeEach(() => {
	totalCount = 20
	isPlaceholderData = false
	vi.mocked(useList).mockClear()
})

describe("usePagedList", () => {
	it("starts on the first page and derives the page count", () => {
		const { result } = setup()

		expect(result.current.params).toEqual({ offset: 0, limit: 8 })
		expect(result.current.currentPage).toBe(1)
		expect(result.current.totalPages).toBe(3)
		expect(result.current.pages).toEqual([1, 2, 3])
	})

	it("has no pages until the data loads", () => {
		totalCount = undefined
		const { result } = setup()

		expect(result.current.pages).toEqual([])
		expect(result.current.totalPages).toBe(0)
	})

	it("moves to the requested page", () => {
		const { result } = setup()

		act(() => result.current.setPage(3))

		expect(result.current.params.offset).toBe(16)
		expect(result.current.currentPage).toBe(3)
	})

	it("steps back to the last page when deleting its only row empties it", () => {
		totalCount = 9
		const { result, rerender } = setup()
		act(() => result.current.setPage(2))
		expect(result.current.currentPage).toBe(2)

		totalCount = 8 // the single row of page 2 was deleted
		rerender()

		expect(result.current.params.offset).toBe(0)
		expect(result.current.currentPage).toBe(1)
	})

	it("steps back to the new last page, not always the first", () => {
		totalCount = 17
		const { result, rerender } = setup()
		act(() => result.current.setPage(3))

		totalCount = 16
		rerender()

		expect(result.current.currentPage).toBe(2)
		expect(result.current.params.offset).toBe(8)
	})

	it("returns to the first page when the list becomes empty", () => {
		totalCount = 9
		const { result, rerender } = setup()
		act(() => result.current.setPage(2))

		totalCount = 0
		rerender()

		expect(result.current.params.offset).toBe(0)
		expect(result.current.pages).toEqual([])
	})

	it("leaves a valid page alone", () => {
		const { result, rerender } = setup()
		act(() => result.current.setPage(2))

		totalCount = 18
		rerender()

		expect(result.current.currentPage).toBe(2)
	})

	it("does not clamp on placeholder data from the previous page", () => {
		const { result, rerender } = setup()
		act(() => result.current.setPage(3))

		isPlaceholderData = true
		totalCount = 8
		rerender()

		expect(result.current.currentPage).toBe(3)
	})

	it("does not clamp before the data has loaded", () => {
		const { result, rerender } = setup()
		act(() => result.current.setPage(3))

		totalCount = undefined
		rerender()

		expect(result.current.currentPage).toBe(3)
	})

	it("sorts ascending first, flips to descending and resets to page 1", () => {
		const { result } = setup()

		act(() => result.current.setPage(2))
		act(() => result.current.toggleSort("name"))

		expect(result.current.params).toMatchObject({
			offset: 0,
			orderBy: "name",
			orderType: "asc"
		})
		expect(result.current.getSortIndicator("name")).toBe("↑")
		expect(result.current.getSortIndicator("created_at")).toBe("")

		act(() => result.current.toggleSort("name"))
		expect(result.current.params.orderType).toBe("desc")
		expect(result.current.getSortIndicator("name")).toBe("↓")

		act(() => result.current.toggleSort("created_at"))
		expect(result.current.params).toMatchObject({
			orderBy: "created_at",
			orderType: "asc"
		})
	})
})
