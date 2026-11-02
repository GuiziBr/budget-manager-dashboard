import { expectTypeOf, test } from "vitest"
import type {
	InstallmentGroup,
	UpdateInstallmentGroupInput
} from "./installment-group"

test("InstallmentGroup matches the API resource", () => {
	expectTypeOf<InstallmentGroup>().toEqualTypeOf<{
		id: string
		description: string
		amountPerInstallment: number
		totalInstallments: number
		paymentIntervalDays: number
		firstPurchasedAt: string
		createdAt: string
		updatedAt: string
		deletedAt: null
	}>()
})

test("only the amount per payment can change", () => {
	expectTypeOf<UpdateInstallmentGroupInput>().toEqualTypeOf<{
		amountPerInstallment: number
	}>()
	const bad: UpdateInstallmentGroupInput = {
		amountPerInstallment: 1,
		// @ts-expect-error totalInstallments is read-only
		totalInstallments: 3
	}
	void bad
})
