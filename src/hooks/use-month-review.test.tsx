// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError, api } from "@/lib/api"
import { createQueryWrapper } from "@/test/query-wrapper"
import type { Expense, Income } from "@/types"
import {
	useReviewExpenses,
	useSaveReviewBills,
	useSaveReviewSalaries
} from "./use-month-review"

afterEach(() => {
	vi.restoreAllMocks()
})

const pageOf = (data: Expense[], total: number, page = 1) =>
	({ data, total, totalAmount: 0, page, limit: 100 }) as never

const expenses = (n: number, from = 0) =>
	Array.from({ length: n }, (_, i) => ({ id: `e${from + i}` }) as Expense)

describe("useReviewExpenses", () => {
	it("stays idle until the period is known", () => {
		const get = vi.spyOn(api, "getPage")
		const { wrapper } = createQueryWrapper()
		renderHook(() => useReviewExpenses(undefined), { wrapper })
		expect(get).not.toHaveBeenCalled()
	})

	it("reads one page when it holds the whole month", async () => {
		const get = vi
			.spyOn(api, "getPage")
			.mockResolvedValue(pageOf(expenses(3), 3))
		const { wrapper } = createQueryWrapper()
		const { result } = renderHook(() => useReviewExpenses("p1"), { wrapper })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toHaveLength(3)
		expect(get).toHaveBeenCalledTimes(1)
		expect(get).toHaveBeenCalledWith("expenses", {
			budgetPeriodId: "p1",
			page: 1,
			limit: 100
		})
	})

	it("follows the pages until the total is reached", async () => {
		const get = vi
			.spyOn(api, "getPage")
			.mockResolvedValueOnce(pageOf(expenses(100), 101))
			.mockResolvedValueOnce(pageOf(expenses(1, 100), 101, 2))
		const { wrapper } = createQueryWrapper()
		const { result } = renderHook(() => useReviewExpenses("p1"), { wrapper })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toHaveLength(101)
		expect(get).toHaveBeenCalledTimes(2)
	})

	it("fails, then loads on refetch", async () => {
		vi.spyOn(api, "getPage")
			.mockRejectedValueOnce(new ApiError("boom", 500))
			.mockResolvedValueOnce(pageOf(expenses(1), 1))
		const { wrapper } = createQueryWrapper()
		const { result } = renderHook(() => useReviewExpenses("p1"), { wrapper })
		await waitFor(() => expect(result.current.isError).toBe(true))
		await result.current.refetch()
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})
})

describe("useSaveReviewBills", () => {
	it("sends one PATCH per change and reports which failed", async () => {
		const patch = vi
			.spyOn(api, "patch")
			.mockImplementation(async (endpoint: string) => {
				if (endpoint === "expenses/b") throw new ApiError("boom", 500)
				return {} as never
			})
		const { wrapper } = createQueryWrapper()
		const { result } = renderHook(() => useSaveReviewBills(), { wrapper })

		const outcome = await result.current.mutateAsync([
			{ id: "a", amount: 112.4 },
			{ id: "b", amount: 50 }
		])

		expect(patch).toHaveBeenCalledWith("expenses/a", { amount: 112.4 })
		expect(patch).toHaveBeenCalledWith("expenses/b", { amount: 50 })
		expect(outcome.saved).toEqual([{ id: "a", amount: 112.4 }])
		expect(outcome.failed).toEqual([{ id: "b", amount: 50 }])
	})
})

describe("useSaveReviewSalaries", () => {
	const wanted = [
		{ key: "a", description: "Salary", amount: 6144 },
		{ key: "b", description: "Side job", amount: 500 }
	]

	it("posts each salary as a salary income without re-reading on the first attempt", async () => {
		const get = vi.spyOn(api, "get")
		const post = vi.spyOn(api, "post").mockResolvedValue({} as never)
		const { wrapper } = createQueryWrapper()
		const { result } = renderHook(() => useSaveReviewSalaries(), { wrapper })

		const outcome = await result.current.mutateAsync({
			periodId: "p1",
			wanted,
			recheck: false,
			sent: {},
			reserved: new Set()
		})

		expect(get).not.toHaveBeenCalled()
		expect(post).toHaveBeenCalledTimes(2)
		expect(post).toHaveBeenCalledWith("incomes", {
			budgetPeriodId: "p1",
			description: "Salary",
			amount: 6144,
			isSalary: true
		})
		expect(outcome.saved.map((s) => s.salary)).toEqual(wanted)
		expect(outcome.failed).toEqual([])
	})

	it("keeps the saved ones when one fails", async () => {
		vi.spyOn(api, "post").mockImplementation((async (
			_: string,
			body: { description: string }
		) => {
			if (body.description === "Side job") throw new ApiError("boom", 500)
			return {}
		}) as never)
		const { wrapper } = createQueryWrapper()
		const { result } = renderHook(() => useSaveReviewSalaries(), { wrapper })

		const outcome = await result.current.mutateAsync({
			periodId: "p1",
			wanted,
			recheck: false,
			sent: {},
			reserved: new Set()
		})

		expect(outcome.saved.map((s) => s.salary.key)).toEqual(["a"])
		expect(outcome.failed.map((s) => s.key)).toEqual(["b"])
	})

	it("on a retry reads the month first and skips what is already there", async () => {
		vi.spyOn(api, "get").mockResolvedValue([
			{ description: "Salary", amount: 6144, isSalary: true }
		] as Income[] as never)
		const post = vi.spyOn(api, "post").mockResolvedValue({} as never)
		const { wrapper } = createQueryWrapper()
		const { result } = renderHook(() => useSaveReviewSalaries(), { wrapper })

		const outcome = await result.current.mutateAsync({
			periodId: "p1",
			wanted,
			recheck: true,
			sent: {},
			reserved: new Set()
		})

		expect(api.get).toHaveBeenCalledWith("incomes?budgetPeriodId=p1")
		expect(post).toHaveBeenCalledTimes(1)
		expect(post).toHaveBeenCalledWith(
			"incomes",
			expect.objectContaining({ description: "Side job" })
		)
		expect(outcome.saved.map((s) => s.salary.key).sort()).toEqual(["a", "b"])
		expect(outcome.failed).toEqual([])
	})

	it("sends nothing and fails all when the re-read fails", async () => {
		vi.spyOn(api, "get").mockRejectedValue(new ApiError("boom", 500))
		const post = vi.spyOn(api, "post")
		const { wrapper } = createQueryWrapper()
		const { result } = renderHook(() => useSaveReviewSalaries(), { wrapper })

		const outcome = await result.current.mutateAsync({
			periodId: "p1",
			wanted,
			recheck: true,
			sent: {},
			reserved: new Set()
		})

		expect(post).not.toHaveBeenCalled()
		expect(outcome.saved).toEqual([])
		expect(outcome.failed).toEqual(wanted)
	})

	it("remembers the payload of a failed row", async () => {
		vi.spyOn(api, "post").mockRejectedValue(new ApiError("boom", 500))
		const { wrapper } = createQueryWrapper()
		const { result } = renderHook(() => useSaveReviewSalaries(), { wrapper })

		const outcome = await result.current.mutateAsync({
			periodId: "p1",
			wanted: [wanted[0] as (typeof wanted)[number]],
			recheck: false,
			sent: {},
			reserved: new Set()
		})

		expect(outcome.sent).toEqual({
			a: { description: "Salary", amount: 6144 }
		})
	})

	it("returns the id of each created income", async () => {
		vi.spyOn(api, "post").mockResolvedValue({ id: "i1" } as never)
		const { wrapper } = createQueryWrapper()
		const { result } = renderHook(() => useSaveReviewSalaries(), { wrapper })

		const outcome = await result.current.mutateAsync({
			periodId: "p1",
			wanted: [wanted[0] as (typeof wanted)[number]],
			recheck: false,
			sent: {},
			reserved: new Set()
		})

		expect(outcome.saved[0]?.incomeId).toBe("i1")
	})

	it("never matches an income reserved for a confirmed row", async () => {
		// Two identical rows: one was saved as `i1`, the other failed
		vi.spyOn(api, "get").mockResolvedValue([
			{ id: "i1", description: "Salary", amount: 1000, isSalary: true }
		] as Income[] as never)
		const post = vi.spyOn(api, "post").mockResolvedValue({ id: "i2" } as never)
		const { wrapper } = createQueryWrapper()
		const { result } = renderHook(() => useSaveReviewSalaries(), { wrapper })

		const outcome = await result.current.mutateAsync({
			periodId: "p1",
			wanted: [{ key: "b", description: "Salary", amount: 1000 }],
			recheck: true,
			sent: {},
			reserved: new Set(["i1"])
		})

		expect(post).toHaveBeenCalledTimes(1)
		expect(outcome.saved[0]?.incomeId).toBe("i2")
	})

	it("updates the income of a row edited after a lost response instead of creating another", async () => {
		vi.spyOn(api, "get").mockResolvedValue([
			{ id: "i1", description: "Job", amount: 3000, isSalary: true }
		] as Income[] as never)
		const post = vi.spyOn(api, "post")
		const patch = vi
			.spyOn(api, "patch")
			.mockResolvedValue({ id: "i1" } as never)
		const { wrapper } = createQueryWrapper()
		const { result } = renderHook(() => useSaveReviewSalaries(), { wrapper })

		const outcome = await result.current.mutateAsync({
			periodId: "p1",
			wanted: [{ key: "a", description: "Job", amount: 3100 }],
			recheck: true,
			sent: { a: [{ description: "Job", amount: 3000 }] },
			reserved: new Set()
		})

		expect(post).not.toHaveBeenCalled()
		expect(patch).toHaveBeenCalledWith("incomes/i1", {
			description: "Job",
			amount: 3100
		})
		expect(outcome.saved[0]?.incomeId).toBe("i1")
		expect(outcome.failed).toEqual([])
	})

	it("keeps a row failed when updating its income fails", async () => {
		vi.spyOn(api, "get").mockResolvedValue([
			{ id: "i1", description: "Job", amount: 3000, isSalary: true }
		] as Income[] as never)
		vi.spyOn(api, "patch").mockRejectedValue(new ApiError("boom", 500))
		const { wrapper } = createQueryWrapper()
		const { result } = renderHook(() => useSaveReviewSalaries(), { wrapper })

		const outcome = await result.current.mutateAsync({
			periodId: "p1",
			wanted: [{ key: "a", description: "Job", amount: 3100 }],
			recheck: true,
			sent: { a: [{ description: "Job", amount: 3000 }] },
			reserved: new Set()
		})

		expect(outcome.failed.map((s) => s.key)).toEqual(["a"])
		expect(outcome.sent.a).toEqual({ description: "Job", amount: 3100 })
	})
})
