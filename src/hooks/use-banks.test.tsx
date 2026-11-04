// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { LOOKUP_STALE_TIME_MS } from "@/lib/constants"
import { createQueryWrapper } from "@/test/query-wrapper"
import { BANKS_QUERY_KEY, useBanks } from "./use-banks"

afterEach(() => {
	vi.restoreAllMocks()
})

describe("useBanks", () => {
	it("loads the list from /banks", async () => {
		const items = [{ id: "1", name: "A" }]
		const get = vi.spyOn(api, "get").mockResolvedValue(items)
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useBanks(), { wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(items)
		expect(get).toHaveBeenCalledWith("banks")
	})

	it("caches the list under its key for the lookup stale time", async () => {
		vi.spyOn(api, "get").mockResolvedValue([])
		const { wrapper, queryClient } = createQueryWrapper()

		const { result } = renderHook(() => useBanks(), { wrapper })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		const query = queryClient
			.getQueryCache()
			.find({ queryKey: BANKS_QUERY_KEY })
		expect(query).toBeDefined()
		expect(query?.observers[0]?.options.staleTime).toBe(LOOKUP_STALE_TIME_MS)
	})

	it("exposes the error when the request fails", async () => {
		vi.spyOn(api, "get").mockRejectedValue(new Error("boom"))
		const { wrapper } = createQueryWrapper()

		const { result } = renderHook(() => useBanks(), { wrapper })

		await waitFor(() => expect(result.current.isError).toBe(true))
	})
})
