import { describe, expect, it } from "vitest"
import type { Income } from "@/types"
import {
	buildCreateIncomeInput,
	buildUpdateIncomeInput,
	EMPTY_INCOME_FORM,
	incomeDeleteMessage,
	incomeFormSchema,
	incomeToFormValues
} from "./income-form"

const income: Income = {
	id: "i1",
	budgetPeriodId: "p1",
	description: "Salary",
	amount: 6144,
	isSalary: true,
	receivedAt: "2026-11-05T00:00:00.000Z",
	createdAt: "2026-11-01T00:00:00.000Z",
	updatedAt: "2026-11-01T00:00:00.000Z",
	deletedAt: null
}

const valid = { ...EMPTY_INCOME_FORM, description: "Gift", amount: "50.00" }

describe("incomeFormSchema", () => {
	it("accepts a description and an amount", () => {
		expect(incomeFormSchema.safeParse(valid).success).toBe(true)
	})

	it("rejects an empty description", () => {
		const result = incomeFormSchema.safeParse({ ...valid, description: "  " })
		expect(result.success).toBe(false)
		expect(result.error?.issues[0].path).toEqual(["description"])
	})

	it.each(["", "0", "0.00", "1.234"])("rejects the amount %j", (amount) => {
		const result = incomeFormSchema.safeParse({ ...valid, amount })
		expect(result.error?.issues.map((issue) => issue.path[0])).toContain(
			"amount"
		)
	})

	it("rejects an amount above the maximum with its own message", () => {
		const result = incomeFormSchema.safeParse({
			...valid,
			amount: "100,000,000.00"
		})
		expect(result.error?.issues[0].message).toMatch(/99,999,999.99/)
	})
})

describe("buildCreateIncomeInput", () => {
	it("trims, parses the amount and leaves the date out when empty", () => {
		expect(
			buildCreateIncomeInput(
				{ ...valid, description: " Gift ", amount: "1,050.50" },
				"p1"
			)
		).toEqual({
			budgetPeriodId: "p1",
			description: "Gift",
			amount: 1050.5,
			isSalary: false
		})
	})

	it("sends the salary flag and the received date", () => {
		expect(
			buildCreateIncomeInput(
				{ ...valid, isSalary: true, receivedAt: "2026-11-05" },
				"p1"
			)
		).toMatchObject({ isSalary: true, receivedAt: "2026-11-05" })
	})

	it("throws on an amount the schema would have refused", () => {
		expect(() =>
			buildCreateIncomeInput({ ...valid, amount: "" }, "p1")
		).toThrow()
	})
})

describe("incomeToFormValues", () => {
	it("fills the form from the income", () => {
		expect(incomeToFormValues(income)).toEqual({
			description: "Salary",
			amount: "6,144.00",
			isSalary: true,
			receivedAt: "2026-11-05"
		})
	})

	it("leaves the date empty when not received", () => {
		expect(incomeToFormValues({ ...income, receivedAt: null }).receivedAt).toBe(
			""
		)
	})
})

describe("buildUpdateIncomeInput", () => {
	it("returns null when nothing changed", () => {
		expect(
			buildUpdateIncomeInput(incomeToFormValues(income), income)
		).toBeNull()
	})

	it("sends only the changed fields", () => {
		const values = { ...incomeToFormValues(income), amount: "6,200.00" }
		expect(buildUpdateIncomeInput(values, income)).toEqual({ amount: 6200 })
	})

	it("sends the new description trimmed and the salary flag", () => {
		const values = {
			...incomeToFormValues(income),
			description: " Pay ",
			isSalary: false
		}
		expect(buildUpdateIncomeInput(values, income)).toEqual({
			description: "Pay",
			isSalary: false
		})
	})

	it("sends null when the date is cleared", () => {
		const values = { ...incomeToFormValues(income), receivedAt: "" }
		expect(buildUpdateIncomeInput(values, income)).toEqual({ receivedAt: null })
	})

	it("sends a changed date", () => {
		const values = { ...incomeToFormValues(income), receivedAt: "2026-11-09" }
		expect(buildUpdateIncomeInput(values, income)).toEqual({
			receivedAt: "2026-11-09"
		})
	})
})

describe("incomeDeleteMessage", () => {
	it("names the income", () => {
		expect(incomeDeleteMessage(income)).toBe(
			"Are you sure you want to delete the income Salary?"
		)
	})
})
