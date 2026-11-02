import { expectTypeOf, test } from "vitest"
import type { Bank } from "./bank"
import type { Category } from "./category"
import type { PaymentType } from "./payment-type"
import type { Store } from "./store"

const stamps = { createdAt: "", updatedAt: "" }

test("Category matches the API resource", () => {
	expectTypeOf<Category>().toEqualTypeOf<{
		id: string
		name: string
		hasBudgetEnvelope: boolean
		createdAt: string
		updatedAt: string
		deletedAt: null
	}>()
})

test("PaymentType matches the API resource", () => {
	expectTypeOf<PaymentType>().toEqualTypeOf<{
		id: string
		name: string
		hasStatement: boolean
		createdAt: string
		updatedAt: string
		deletedAt: null
	}>()
})

test("Bank and Store share one shape", () => {
	const shape = {
		id: "",
		name: "",
		...stamps,
		deletedAt: null
	}
	expectTypeOf(shape).toExtend<Bank>()
	expectTypeOf(shape).toExtend<Store>()
	expectTypeOf<Bank>().toEqualTypeOf<Store>()
})
