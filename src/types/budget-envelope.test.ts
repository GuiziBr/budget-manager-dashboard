import { expectTypeOf, test } from "vitest"
import type { BudgetEnvelope, CreateEnvelopeInput } from "./budget-envelope"

test("BudgetEnvelope holds only the allocation", () => {
	expectTypeOf<BudgetEnvelope>().toEqualTypeOf<{
		id: string
		budgetPeriodId: string
		categoryId: string
		allocatedAmount: number
		createdAt: string
		updatedAt: string
		deletedAt: null
	}>()
	expectTypeOf<BudgetEnvelope>().not.toHaveProperty("spent")
})

test("CreateEnvelopeInput needs the budget once", () => {
	expectTypeOf<CreateEnvelopeInput>().toEqualTypeOf<{
		budgetPeriodId: string
		categoryId: string
		allocatedAmount: number
	}>()
})
