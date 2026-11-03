import { expectTypeOf, test } from "vitest"
import type { PagedResponse, SortOrder } from "./common"

test("PagedResponse has the body-paged shape", () => {
	expectTypeOf<PagedResponse<string>>().toEqualTypeOf<{
		data: string[]
		total: number
		page: number
		limit: number
	}>()
})

test("SortOrder is asc or desc", () => {
	expectTypeOf<SortOrder>().toEqualTypeOf<"asc" | "desc">()
})
