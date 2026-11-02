import { expectTypeOf, test } from "vitest"
import type { CreateIncomeInput, Income, UpdateIncomeInput } from "./income"

test("Income matches the API resource", () => {
	expectTypeOf<Income>().toEqualTypeOf<{
		id: string
		budgetPeriodId: string
		description: string
		amount: number
		isSalary: boolean
		receivedAt: string | null
		createdAt: string
		updatedAt: string
		deletedAt: null
	}>()
})

test("create and update inputs", () => {
	expectTypeOf<CreateIncomeInput>().toEqualTypeOf<{
		budgetPeriodId: string
		description: string
		amount: number
		isSalary?: boolean
		receivedAt?: string | null
	}>()
	expectTypeOf<UpdateIncomeInput>().toEqualTypeOf<{
		description?: string
		amount?: number
		isSalary?: boolean
		receivedAt?: string | null
	}>()
	expectTypeOf<UpdateIncomeInput>().not.toHaveProperty("budgetPeriodId")
})
