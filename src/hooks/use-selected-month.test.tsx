// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import { useSelectedMonth } from "./use-selected-month"

const nav = vi.hoisted(() => ({ search: "", push: vi.fn() }))
vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(nav.search),
	useRouter: () => ({ push: nav.push })
}))

const period = {
	id: "p1",
	year: 2026,
	month: 3,
	createdAt: "",
	updatedAt: "",
	deletedAt: null
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] })
	vi.setSystemTime(new Date("2026-11-02T12:00:00Z"))
	nav.search = ""
	nav.push.mockClear()
	vi.spyOn(api, "get").mockResolvedValue([period])
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

const setup = () =>
	renderHook(() => useSelectedMonth(), {
		wrapper: createQueryWrapper().wrapper
	})

describe("useSelectedMonth", () => {
	it("shows the current month when the address has no period", () => {
		const { result } = setup()
		expect(result.current.month).toEqual({ year: 2026, month: 11 })
		expect(result.current.comparison).toBe("current")
	})

	it("falls back to the current month for an invalid period", () => {
		nav.search = "period=garbage"
		expect(setup().result.current.month).toEqual({ year: 2026, month: 11 })
	})

	it("pushes the next month into the address", () => {
		const { result } = setup()
		result.current.select(result.current.next as never)
		expect(nav.push).toHaveBeenCalledWith("/month?period=2026-12")
	})

	it("steps back across a year boundary", () => {
		nav.search = "period=2026-01"
		expect(setup().result.current.prev).toEqual({ year: 2025, month: 12 })
	})

	it("has no next month past December of next year", () => {
		nav.search = "period=2027-12"
		expect(setup().result.current.next).toBeNull()
	})

	it("finds the opened period for the selected month", async () => {
		nav.search = "period=2026-03"
		const { result } = setup()
		await waitFor(() => expect(result.current.period).toEqual(period))
	})
})
