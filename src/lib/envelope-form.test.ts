import { describe, expect, it } from "vitest"
import type { BudgetEnvelope, Category } from "@/types"
import {
	availableEnvelopeCategories,
	buildCreateEnvelopeInput,
	buildUpdateEnvelopeInput,
	envelopeDeleteMessage,
	envelopeFormSchema,
	envelopeToFormValues
} from "./envelope-form"

const category = (id: string, name: string, hasBudgetEnvelope = true) =>
	({ id, name, hasBudgetEnvelope }) as Category

const envelope = (categoryId: string, allocatedAmount = 600) =>
	({
		id: `e-${categoryId}`,
		budgetPeriodId: "p1",
		categoryId,
		allocatedAmount,
		spentAmount: 10,
		spendUpdatedAt: null
	}) as BudgetEnvelope

describe("envelopeFormSchema", () => {
	it("accepts a category and a valid budget", () => {
		expect(
			envelopeFormSchema.safeParse({ categoryId: "c1", amount: "1,250.50" })
				.success
		).toBe(true)
	})

	it("requires a category", () => {
		const result = envelopeFormSchema.safeParse({
			categoryId: "",
			amount: "10.00"
		})
		expect(result.success).toBe(false)
		expect(result.error?.issues[0].path).toEqual(["categoryId"])
	})

	it.each(["", "0", "0.00", "1.234", "abc", "-5"])(
		"rejects the budget %j",
		(amount) => {
			const result = envelopeFormSchema.safeParse({ categoryId: "c1", amount })
			expect(result.success).toBe(false)
			expect(result.error?.issues[0].path).toEqual(["amount"])
		}
	)

	it("rejects a budget over the limit with its own message", () => {
		const result = envelopeFormSchema.safeParse({
			categoryId: "c1",
			amount: "100,000,000.00"
		})
		expect(result.error?.issues[0].message).toBe(
			"The budget can't be more than 99,999,999.99."
		)
	})
})

describe("buildCreateEnvelopeInput", () => {
	it("builds the POST body", () => {
		expect(
			buildCreateEnvelopeInput({ categoryId: "c1", amount: "300.00" }, "p1")
		).toEqual({ budgetPeriodId: "p1", categoryId: "c1", allocatedAmount: 300 })
	})

	it("refuses an invalid amount", () => {
		expect(() =>
			buildCreateEnvelopeInput({ categoryId: "c1", amount: "" }, "p1")
		).toThrow()
	})
})

describe("envelopeToFormValues and buildUpdateEnvelopeInput", () => {
	it("fills the form from the envelope", () => {
		expect(envelopeToFormValues(envelope("c1", 1250.5))).toEqual({
			categoryId: "c1",
			amount: "1,250.50"
		})
	})

	it("sends only the changed budget", () => {
		expect(
			buildUpdateEnvelopeInput(
				{ categoryId: "c1", amount: "700.00" },
				envelope("c1", 600)
			)
		).toEqual({ allocatedAmount: 700 })
	})

	it("returns null when the budget is unchanged", () => {
		expect(
			buildUpdateEnvelopeInput(
				{ categoryId: "c1", amount: "600.00" },
				envelope("c1", 600)
			)
		).toBeNull()
	})

	it("returns null for an amount that isn't valid", () => {
		expect(
			buildUpdateEnvelopeInput(
				{ categoryId: "c1", amount: "" },
				envelope("c1", 600)
			)
		).toBeNull()
	})
})

describe("availableEnvelopeCategories", () => {
	const categories = [
		category("c1", "Parking"),
		category("c2", "Fuel"),
		category("c3", "Rent", false),
		category("c4", "Grocery")
	]

	it("offers only envelope categories without an envelope, by name", () => {
		expect(
			availableEnvelopeCategories(categories, [envelope("c4")]).map(
				(c) => c.name
			)
		).toEqual(["Fuel", "Parking"])
	})

	it("offers a category again after its envelope is deleted", () => {
		expect(
			availableEnvelopeCategories(categories, [envelope("c1"), envelope("c4")])
		).toEqual([categories[1]])
	})

	it("is empty when every envelope category has one", () => {
		expect(
			availableEnvelopeCategories(categories, [
				envelope("c1"),
				envelope("c2"),
				envelope("c4")
			])
		).toEqual([])
	})
})

describe("envelopeDeleteMessage", () => {
	it("names the category", () => {
		expect(envelopeDeleteMessage("Parking")).toContain("the Parking envelope")
	})

	it("marks a category that is gone", () => {
		expect(envelopeDeleteMessage(null)).toContain("the (deleted) envelope")
	})
})
