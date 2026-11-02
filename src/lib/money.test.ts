import { describe, expect, it } from "vitest"
import { formatCad } from "./money"

describe("formatCad", () => {
	it("formats an amount with the currency and no sign", () => {
		expect(formatCad(1450)).toBe("CAD 1,450.00")
		expect(formatCad(120.5)).toBe("CAD 120.50")
	})

	it("groups thousands", () => {
		expect(formatCad(6144)).toBe("CAD 6,144.00")
		expect(formatCad(1234567.89)).toBe("CAD 1,234,567.89")
		expect(formatCad(99999999.99)).toBe("CAD 99,999,999.99")
	})

	it("rounds to 2 decimals", () => {
		expect(formatCad(6530.484)).toBe("CAD 6,530.48")
		expect(formatCad(6530.486)).toBe("CAD 6,530.49")
		expect(formatCad(0.1 + 0.2)).toBe("CAD 0.30")
	})

	it("formats zero", () => {
		expect(formatCad(0)).toBe("CAD 0.00")
		expect(formatCad(0, { sign: "plus" })).toBe("+ CAD 0.00")
	})

	it("prefixes incomes with a plus", () => {
		expect(formatCad(6144, { sign: "plus" })).toBe("+ CAD 6,144.00")
	})

	it("shows a minus for negatives", () => {
		expect(formatCad(-120)).toBe("- CAD 120.00")
		expect(formatCad(-1234.5)).toBe("- CAD 1,234.50")
	})

	it("lets a negative amount keep its minus even with the plus option", () => {
		expect(formatCad(-120, { sign: "plus" })).toBe("- CAD 120.00")
	})

	it("never shows a minus on an amount that rounds to zero", () => {
		expect(formatCad(-0)).toBe("CAD 0.00")
		expect(formatCad(-0.004)).toBe("CAD 0.00")
		expect(formatCad(-0.004, { sign: "plus" })).toBe("+ CAD 0.00")
	})

	describe("compact form", () => {
		it("drops the currency", () => {
			expect(formatCad(1450, { compact: true })).toBe("1,450.00")
			expect(formatCad(6144, { sign: "plus", compact: true })).toBe(
				"+ 6,144.00"
			)
			expect(formatCad(-120, { compact: true })).toBe("- 120.00")
			expect(formatCad(0, { compact: true })).toBe("0.00")
		})
	})

	it("reproduces the spec's summary example", () => {
		const expenses = 6013.62 + 516.86
		expect(formatCad(expenses)).toBe("CAD 6,530.48")
		expect(formatCad(7375.67 - expenses)).toBe("CAD 845.19")
	})
})
