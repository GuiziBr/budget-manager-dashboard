import { expectTypeOf, test } from "vitest"
import type { BudgetPeriod, CreateBudgetPeriodInput } from "./budget-period"

test("BudgetPeriod matches the API resource", () => {
	expectTypeOf<BudgetPeriod>().toEqualTypeOf<{
		id: string
		year: number
		month: number
		createdAt: string
		updatedAt: string
		deletedAt: null
	}>()
})

test("CreateBudgetPeriodInput is year and month", () => {
	expectTypeOf<CreateBudgetPeriodInput>().toEqualTypeOf<{
		year: number
		month: number
	}>()
})
