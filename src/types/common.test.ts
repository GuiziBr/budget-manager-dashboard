import { expectTypeOf, test } from "vitest"
import type { PagedResponse } from "./common"

test("PagedResponse has the body-paged shape", () => {
	expectTypeOf<PagedResponse<string>>().toEqualTypeOf<{
		data: string[]
		total: number
		page: number
		limit: number
	}>()
})
