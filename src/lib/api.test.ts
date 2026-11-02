import { afterEach, describe, expect, it, vi } from "vitest"
import type { ExpensePage } from "@/types"
import { ApiError, api } from "./api"

const jsonResponse = (
	status: number,
	body: unknown,
	headers: Record<string, string> = {}
) =>
	new Response(status === 204 ? null : JSON.stringify(body), {
		status,
		headers
	})

describe("ApiClient", () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("sends a JSON body to the API base URL", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(jsonResponse(200, { id: 1 }))

		await api.post("items", { name: "a" })

		const [url, config] = fetchMock.mock.calls[0]
		expect(String(url)).toMatch(/\/items$/)
		expect(config?.method).toBe("POST")
		expect(config?.body).toBe(JSON.stringify({ name: "a" }))
	})

	it("returns the parsed JSON body", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			jsonResponse(200, { id: 1 })
		)

		await expect(api.get("items/1")).resolves.toEqual({ id: 1 })
	})

	it("returns an empty object on 204 No Content", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(204, null))

		await expect(api.delete("items/1")).resolves.toEqual({})
	})

	it("reads x-total-count in getWithHeaders", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			jsonResponse(200, [{ id: 1 }], { "x-total-count": "42" })
		)

		await expect(api.getWithHeaders("items")).resolves.toEqual({
			data: [{ id: 1 }],
			totalCount: 42
		})
	})

	it("defaults the total count to 0 when the header is missing", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, []))

		const result = await api.getWithHeaders("items")
		expect(result.totalCount).toBe(0)
	})

	it("throws an ApiError with the server message", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			jsonResponse(404, { message: "Not found" })
		)

		const error = await api.get("items/9").catch((e) => e)
		expect(error).toBeInstanceOf(ApiError)
		expect(error).toMatchObject({ message: "Not found", status: 404 })
	})

	it("falls back to a generic message when the error body is not JSON", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("oops", { status: 500 })
		)

		await expect(api.get("items")).rejects.toMatchObject({
			message: "API Error: 500",
			status: 500
		})
	})

	it("supports put and patch", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockImplementation(async () => jsonResponse(200, {}))

		await api.put("items/1", { a: 1 })
		await api.patch("items/1", { a: 2 })

		expect(fetchMock.mock.calls.map(([, c]) => c?.method)).toEqual([
			"PUT",
			"PATCH"
		])
	})

	describe("getPage", () => {
		const page = (overrides: Partial<ExpensePage> = {}): ExpensePage => ({
			data: [],
			total: 0,
			totalAmount: 0,
			page: 1,
			limit: 20,
			...overrides
		})

		it("returns the body as is, including totalAmount", async () => {
			const body = page({ total: 42, totalAmount: 1234.56 })
			vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, body))

			await expect(api.getPage<ExpensePage>("expenses")).resolves.toEqual(body)
		})

		it("sends the page, sort and filter params", async () => {
			const fetchMock = vi
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(jsonResponse(200, page()))

			await api.getPage<ExpensePage>("expenses", {
				budgetPeriodId: "p1",
				page: 2,
				limit: 20,
				sortBy: "dueAt",
				sortOrder: "asc"
			})

			const url = new URL(String(fetchMock.mock.calls[0][0]))
			expect(url.pathname).toMatch(/\/expenses$/)
			expect(Object.fromEntries(url.searchParams)).toEqual({
				budgetPeriodId: "p1",
				page: "2",
				limit: "20",
				sortBy: "dueAt",
				sortOrder: "asc"
			})
		})

		it("omits undefined params", async () => {
			const fetchMock = vi
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(jsonResponse(200, page()))

			await api.getPage<ExpensePage>("expenses", {
				page: 1,
				sortBy: undefined
			})

			expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/expenses\?page=1$/)
		})

		it("returns a last page with fewer rows than the limit", async () => {
			const body = page({ total: 45, page: 3, data: [] })
			vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, body))

			const result = await api.getPage<ExpensePage>("expenses", { page: 3 })
			expect(result).toMatchObject({ page: 3, total: 45 })
		})

		it("returns an empty list", async () => {
			vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, page()))

			await expect(api.getPage<ExpensePage>("expenses")).resolves.toMatchObject(
				{ data: [], total: 0, totalAmount: 0 }
			)
		})

		it("throws an ApiError on a 400", async () => {
			vi.spyOn(globalThis, "fetch").mockResolvedValue(
				jsonResponse(400, { message: "Bad Request" })
			)

			await expect(
				api.getPage<ExpensePage>("expenses", { limit: 500 })
			).rejects.toMatchObject({ message: "Bad Request", status: 400 })
		})
	})
})
