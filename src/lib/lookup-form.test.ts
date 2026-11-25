import { describe, expect, it } from "vitest"
import type { Bank, Category, PaymentType, Store } from "@/types"
import {
	buildCreateLookupInput,
	buildUpdateLookupInput,
	EMPTY_LOOKUP_FORM,
	isDuplicateName,
	lookupFormSchema,
	lookupToFormValues,
	nameChanged,
	sortLookups
} from "./lookup-form"

const stamps = {
	createdAt: "2026-11-01T00:00:00.000Z",
	updatedAt: "2026-11-01T00:00:00.000Z",
	deletedAt: null
} as const

const category: Category = {
	id: "c1",
	name: "Grocery",
	hasBudgetEnvelope: true,
	...stamps
}
const paymentType: PaymentType = {
	id: "p1",
	name: "Credit Card",
	hasStatement: true,
	...stamps
}
const bank: Bank = { id: "b1", name: "Nubank", ...stamps }
const store: Store = { id: "s1", name: "Costco", ...stamps }

describe("lookupFormSchema", () => {
	it("accepts a name and trims it", () => {
		const result = lookupFormSchema.safeParse({
			...EMPTY_LOOKUP_FORM,
			name: "  Rent "
		})
		expect(result.success).toBe(true)
		expect(result.data?.name).toBe("Rent")
	})

	it.each(["", "   "])("rejects the empty name %j", (name) => {
		const result = lookupFormSchema.safeParse({ ...EMPTY_LOOKUP_FORM, name })
		expect(result.success).toBe(false)
		expect(result.error?.issues[0].path).toEqual(["name"])
	})

	it("sets no maximum length", () => {
		const name = "x".repeat(500)
		expect(
			lookupFormSchema.safeParse({ ...EMPTY_LOOKUP_FORM, name }).success
		).toBe(true)
	})
})

describe("isDuplicateName", () => {
	const items = [category, { id: "c2", name: "Rent" }]

	it("matches ignoring case and surrounding spaces", () => {
		expect(isDuplicateName(" grocery ", items)).toBe(true)
		expect(isDuplicateName("RENT", items)).toBe(true)
	})

	it("does not match a different name or an empty list", () => {
		expect(isDuplicateName("Gym", items)).toBe(false)
		expect(isDuplicateName("Gym", [])).toBe(false)
	})

	it("skips the item being edited", () => {
		expect(isDuplicateName("grocery", items, "c1")).toBe(false)
		expect(isDuplicateName("rent", items, "c1")).toBe(true)
	})
})

describe("nameChanged", () => {
	it("is false for the same name, even with surrounding spaces", () => {
		expect(nameChanged("Grocery", category)).toBe(false)
		expect(nameChanged("  Grocery ", category)).toBe(false)
	})

	it("is true for a different name, including a case-only change", () => {
		expect(nameChanged("Food", category)).toBe(true)
		expect(nameChanged("grocery", category)).toBe(true)
	})
})

describe("lookupToFormValues", () => {
	it("prefills the name and the flag of each lookup", () => {
		expect(lookupToFormValues("category", category)).toEqual({
			name: "Grocery",
			hasBudgetEnvelope: true,
			hasStatement: false
		})
		expect(lookupToFormValues("paymentType", paymentType)).toEqual({
			name: "Credit Card",
			hasBudgetEnvelope: false,
			hasStatement: true
		})
		expect(lookupToFormValues("bank", bank)).toEqual({
			...EMPTY_LOOKUP_FORM,
			name: "Nubank"
		})
		expect(lookupToFormValues("store", store).name).toBe("Costco")
	})
})

describe("buildCreateLookupInput", () => {
	const values = { ...EMPTY_LOOKUP_FORM, name: " New " }

	it("sends the flag even when the switch is off", () => {
		expect(buildCreateLookupInput("category", values)).toEqual({
			name: "New",
			hasBudgetEnvelope: false
		})
		expect(
			buildCreateLookupInput("paymentType", { ...values, hasStatement: true })
		).toEqual({ name: "New", hasStatement: true })
	})

	it("sends only the name for banks and stores", () => {
		expect(
			buildCreateLookupInput("bank", { ...values, hasStatement: true })
		).toEqual({ name: "New" })
		expect(buildCreateLookupInput("store", values)).toEqual({ name: "New" })
	})
})

describe("buildUpdateLookupInput", () => {
	it("returns null when nothing changed", () => {
		expect(
			buildUpdateLookupInput(
				"category",
				lookupToFormValues("category", category),
				category
			)
		).toBeNull()
		expect(
			buildUpdateLookupInput(
				"bank",
				{ ...EMPTY_LOOKUP_FORM, name: " Nubank " },
				bank
			)
		).toBeNull()
	})

	it("sends only the changed name", () => {
		expect(
			buildUpdateLookupInput(
				"category",
				{ ...lookupToFormValues("category", category), name: "Food" },
				category
			)
		).toEqual({ name: "Food" })
	})

	it("sends only the changed flag", () => {
		expect(
			buildUpdateLookupInput(
				"category",
				{
					...lookupToFormValues("category", category),
					hasBudgetEnvelope: false
				},
				category
			)
		).toEqual({ hasBudgetEnvelope: false })
		expect(
			buildUpdateLookupInput(
				"paymentType",
				{
					...lookupToFormValues("paymentType", paymentType),
					hasStatement: false
				},
				paymentType
			)
		).toEqual({ hasStatement: false })
	})

	it("sends both when both changed", () => {
		expect(
			buildUpdateLookupInput(
				"paymentType",
				{ ...EMPTY_LOOKUP_FORM, name: "Debit" },
				paymentType
			)
		).toEqual({ name: "Debit", hasStatement: false })
	})

	it("ignores a flag that does not belong to the lookup", () => {
		expect(
			buildUpdateLookupInput(
				"store",
				{ name: "Costco", hasBudgetEnvelope: true, hasStatement: true },
				store
			)
		).toBeNull()
	})
})

describe("sortLookups", () => {
	it("sorts alphabetically ignoring case, without mutating the input", () => {
		const items = [{ name: "banana" }, { name: "Cherry" }, { name: "Apple" }]
		expect(sortLookups(items).map((i) => i.name)).toEqual([
			"Apple",
			"banana",
			"Cherry"
		])
		expect(items[0].name).toBe("banana")
	})
})
