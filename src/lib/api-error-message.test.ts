import { describe, expect, it } from "vitest"
import { ApiError } from "./api"
import {
	describeApiError,
	getApiErrorMessage,
	isAlreadyDeleted,
	isMonthClosedError
} from "./api-error-message"

const GENERIC = "Something went wrong. Try again."
const save = { action: "saveExpense" } as const

describe("future purchase dates", () => {
	const expected = {
		kind: "futureDate",
		message: "The purchase date can't be in the future.",
		field: "purchasedAt"
	}

	it("400 with the backend's text points at the purchase date", () => {
		expect(
			describeApiError(new ApiError("Date cannot be in the future", 400), save)
		).toEqual(expected)
	})

	it("also reads it from a list of validation issues", () => {
		const issues = [
			{ path: ["purchasedAt"], message: "Date cannot be in the future" }
		]
		expect(
			describeApiError(new ApiError(JSON.stringify(issues), 400), save)
		).toEqual(expected)
	})

	it("other validation lists stay generic", () => {
		const issues = [{ path: ["amount"], message: "Invalid input" }]
		expect(
			describeApiError(new ApiError(JSON.stringify(issues), 400), save)
		).toEqual({ kind: "generic", message: GENERIC })
	})
})

describe("describeApiError", () => {
	it("409 when opening a month names the month", () => {
		expect(
			describeApiError(new ApiError("exists", 409), {
				action: "openMonth",
				month: "December 2026"
			})
		).toEqual({
			kind: "monthExists",
			message: "December 2026 is already open."
		})
	})

	it("409 when deleting a month asks to remove its content first", () => {
		expect(
			describeApiError(new ApiError("linked", 409), { action: "deleteMonth" })
		).toEqual({
			kind: "monthNotEmpty",
			message: "Remove this month's expenses, incomes and envelopes first."
		})
	})

	it("409 when creating an envelope names the category", () => {
		expect(
			describeApiError(new ApiError("exists", 409), {
				action: "createEnvelope",
				category: "Grocery"
			})
		).toEqual({
			kind: "envelopeExists",
			message: "Grocery already has an envelope this month."
		})
	})

	it("404 when changing or deleting an envelope says it is gone", () => {
		for (const action of ["updateEnvelope", "deleteEnvelope"] as const) {
			expect(describeApiError(new ApiError("nope", 404), { action })).toEqual({
				kind: "envelopeGone",
				message: "This envelope no longer exists."
			})
			expect(describeApiError(new ApiError("boom", 500), { action }).kind).toBe(
				"generic"
			)
			expect(describeApiError(new ApiError("past", 422), { action }).kind).toBe(
				"monthClosed"
			)
		}
	})

	it("400 bank required points at the Bank field", () => {
		expect(
			describeApiError(
				new ApiError("bankId is required for this payment type", 400),
				save
			)
		).toEqual({
			kind: "bankRequired",
			message: "Bank is required for this payment type.",
			field: "bank"
		})
	})

	it("400 with no period for installments", () => {
		expect(
			describeApiError(
				new ApiError(
					"No matching budget periods found for any installment due date",
					400
				),
				save
			)
		).toEqual({
			kind: "noPeriodForInstallments",
			message: "Open the month of the first payment before adding this plan."
		})
	})

	it.each([
		["Category", "category", "Category"],
		["PaymentType", "paymentType", "Payment type"],
		["Bank", "bank", "Bank"],
		["Store", "store", "Store"]
	])("404 for a missing %s names the field", (entity, field, label) => {
		expect(
			describeApiError(
				new ApiError(`${entity} with id abc not found`, 404),
				save
			)
		).toEqual({
			kind: "lookupGone",
			message: `${label} no longer exists. Choose another.`,
			field
		})
	})

	it("404 for the expense or the period is generic", () => {
		for (const text of [
			"Expense with id abc not found",
			"BudgetPeriod with id abc not found",
			"not found"
		]) {
			expect(describeApiError(new ApiError(text, 404), save).kind).toBe(
				"generic"
			)
		}
	})

	it("422 is the past-month envelope rule in any context", () => {
		for (const context of [
			save,
			{ action: "mutate" },
			{ action: "createEnvelope", category: "Grocery" }
		] as const) {
			expect(describeApiError(new ApiError("past", 422), context)).toEqual({
				kind: "monthClosed",
				message: "Envelopes of past months can't be changed."
			})
		}
	})

	it("network errors, 500 and non-errors are generic", () => {
		const values = [
			new TypeError("Failed to fetch"),
			new ApiError("Internal Server Error", 500),
			null,
			undefined,
			"boom"
		]
		for (const value of values) {
			expect(describeApiError(value, save)).toEqual({
				kind: "generic",
				message: GENERIC
			})
		}
	})

	it("never shows raw backend text for unmatched responses", () => {
		const error = new ApiError("secret detail", 409)
		expect(getApiErrorMessage(error, { action: "mutate" })).toBe(GENERIC)
		expect(getApiErrorMessage(error, save)).toBe(GENERIC)
	})

	it("400 with unrelated text, or outside the expense form, is generic", () => {
		expect(describeApiError(new ApiError("other", 400), save).kind).toBe(
			"generic"
		)
		expect(
			describeApiError(
				new ApiError("bankId is required for this payment type", 400),
				{ action: "mutate" }
			).kind
		).toBe("generic")
	})

	it("keeps the error unchanged", () => {
		const error = new ApiError("exists", 409)
		describeApiError(error, { action: "openMonth", month: "May 2027" })
		expect(error.message).toBe("exists")
		expect(error.status).toBe(409)
	})
})

describe("getApiErrorMessage", () => {
	it("returns the message of the description", () => {
		expect(
			getApiErrorMessage(new ApiError("past", 422), { action: "mutate" })
		).toBe("Envelopes of past months can't be changed.")
	})
})

describe("isMonthClosedError", () => {
	it("is true only for a 422 ApiError", () => {
		expect(isMonthClosedError(new ApiError("past", 422))).toBe(true)
		expect(isMonthClosedError(new ApiError("conflict", 409))).toBe(false)
		expect(isMonthClosedError(new Error("422"))).toBe(false)
		expect(isMonthClosedError(null)).toBe(false)
	})
})

describe("changing a plan's amount", () => {
	const change = { action: "changePlanAmount" } as const

	it("says the plan is gone on a 404", () => {
		expect(describeApiError(new ApiError("not found", 404), change)).toEqual({
			kind: "planGone",
			message: "This plan no longer exists."
		})
	})

	it("gives the generic message for anything else", () => {
		for (const status of [400, 500]) {
			expect(describeApiError(new ApiError("x", status), change).kind).toBe(
				"generic"
			)
		}
		expect(describeApiError(new TypeError("offline"), change).kind).toBe(
			"generic"
		)
	})
})

const LOOKUPS = [
	["category", "category", "A category"],
	["paymentType", "payment type", "A payment type"],
	["bank", "bank", "A bank"],
	["store", "store", "A store"]
] as const

describe.each(LOOKUPS)("saving a %s", (lookup, item, withArticle) => {
	const ctx = { action: "saveLookup", lookup, name: "Nubank" } as const
	const failed = `Couldn't save the ${item}. Try again.`

	it("409 marks the Name field", () => {
		expect(describeApiError(new ApiError("dup", 409), ctx)).toEqual({
			kind: "duplicateName",
			message: `${withArticle} named 'Nubank' already exists.`,
			field: "name"
		})
	})

	it("404 says it no longer exists", () => {
		expect(describeApiError(new ApiError("gone", 404), ctx)).toEqual({
			kind: "lookupItemGone",
			message: `This ${item} no longer exists.`
		})
	})

	it.each([400, 422, 500])("%i gives the generic save message", (status) => {
		expect(
			describeApiError(new ApiError("raw backend text", status), ctx)
		).toEqual({ kind: "generic", message: failed })
	})

	it("a network failure gives the generic save message", () => {
		expect(describeApiError(new TypeError("fetch failed"), ctx)).toEqual({
			kind: "generic",
			message: failed
		})
	})
})

describe.each(LOOKUPS)("deleting a %s", (lookup, item) => {
	const ctx = { action: "deleteLookup", lookup, name: "Nubank" } as const
	const failed = `Couldn't delete the ${item}. Try again.`

	it("409 says it is still in use", () => {
		const envelopes = lookup === "category" ? " or envelope" : ""
		expect(describeApiError(new ApiError("in use", 409), ctx)).toEqual({
			kind: "inUse",
			message: `Nubank is still in use by a recurring bill, or by an expense${envelopes} in the current or a future month. Change or remove those first.`
		})
	})

	it("404 counts as deleted, with no message", () => {
		expect(describeApiError(new ApiError("gone", 404), ctx)).toEqual({
			kind: "alreadyDeleted",
			message: ""
		})
	})

	it.each([400, 422, 500])("%i gives the generic delete message", (status) => {
		expect(
			describeApiError(new ApiError("raw backend text", status), ctx)
		).toEqual({ kind: "generic", message: failed })
	})

	it("a network failure gives the generic delete message", () => {
		expect(getApiErrorMessage(new TypeError("fetch failed"), ctx)).toBe(failed)
	})
})

describe("isAlreadyDeleted", () => {
	it("is true only for a 404", () => {
		expect(isAlreadyDeleted(new ApiError("gone", 404))).toBe(true)
		expect(isAlreadyDeleted(new ApiError("boom", 500))).toBe(false)
		expect(isAlreadyDeleted(new Error("x"))).toBe(false)
	})
})
