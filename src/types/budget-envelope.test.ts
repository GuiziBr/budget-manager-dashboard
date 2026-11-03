import { expectTypeOf, test } from "vitest"
import type { BudgetEnvelope, CreateEnvelopeInput } from "./budget-envelope"

test("BudgetEnvelope carries the allocation and the spend", () => {
	expectTypeOf<BudgetEnvelope>().toEqualTypeOf<{
		id: string
		budgetPeriodId: string
		categoryId: string
		allocatedAmount: number
		spentAmount: number | null
		spendUpdatedAt: string | null
		createdAt: string
		updatedAt: string
		deletedAt: null
	}>()
	expectTypeOf<BudgetEnvelope>().not.toHaveProperty("spent")
	expectTypeOf<BudgetEnvelope["spentAmount"]>().toEqualTypeOf<number | null>()
})

test("CreateEnvelopeInput needs the budget once", () => {
	expectTypeOf<CreateEnvelopeInput>().toEqualTypeOf<{
		budgetPeriodId: string
		categoryId: string
		allocatedAmount: number
	}>()
})
