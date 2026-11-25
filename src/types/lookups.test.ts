import { expectTypeOf, test } from "vitest"
import type { Bank, CreateBankInput, UpdateBankInput } from "./bank"
import type {
	Category,
	CreateCategoryInput,
	UpdateCategoryInput
} from "./category"
import type {
	CreatePaymentTypeInput,
	PaymentType,
	UpdatePaymentTypeInput
} from "./payment-type"
import type { CreateStoreInput, Store, UpdateStoreInput } from "./store"

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

test("the lookup inputs match the API bodies", () => {
	expectTypeOf<CreateCategoryInput>().toEqualTypeOf<{
		name: string
		hasBudgetEnvelope: boolean
	}>()
	expectTypeOf<UpdateCategoryInput>().toEqualTypeOf<{
		name?: string
		hasBudgetEnvelope?: boolean
	}>()
	expectTypeOf<CreatePaymentTypeInput>().toEqualTypeOf<{
		name: string
		hasStatement: boolean
	}>()
	expectTypeOf<UpdatePaymentTypeInput>().toEqualTypeOf<{
		name?: string
		hasStatement?: boolean
	}>()
	expectTypeOf<CreateBankInput>().toEqualTypeOf<{ name: string }>()
	expectTypeOf<UpdateBankInput>().toEqualTypeOf<{ name?: string }>()
	expectTypeOf<CreateStoreInput>().toEqualTypeOf<{ name: string }>()
	expectTypeOf<UpdateStoreInput>().toEqualTypeOf<{ name?: string }>()
})
