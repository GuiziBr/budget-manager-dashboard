import { expectTypeOf, test } from "vitest"
import type { RecurringExpense } from "./recurring-expense"

test("RecurringExpense matches the API resource", () => {
	expectTypeOf<RecurringExpense>().toEqualTypeOf<{
		id: string
		categoryId: string
		paymentTypeId: string
		bankId: string | null
		storeId: string | null
		description: string
		amount: number
		startedAt: string
		cancelledAt: string | null
		monthsAlreadyPaid: number
		createdAt: string
		updatedAt: string
		deletedAt: null
	}>()
})
