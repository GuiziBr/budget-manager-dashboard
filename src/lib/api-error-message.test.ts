import { describe, expect, it } from "vitest"
import { ApiError } from "./api"
import {
	describeApiError,
	getApiErrorMessage,
	isMonthClosedError
} from "./api-error-message"

const GENERIC = "Something went wrong. Try again."
const save = { action: "saveExpense" } as const

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
