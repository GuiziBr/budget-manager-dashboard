import { describe, expect, it } from "vitest"
import { checkMoney, formatCad, formatMoneyInput, parseMoney } from "./money"

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

describe("checkMoney / parseMoney", () => {
	it.each([
		["25", 25],
		["25.5", 25.5],
		["25.00", 25],
		[" 0.01 ", 0.01],
		["1,250.50", 1250.5],
		["99,999,999.99", 99_999_999.99],
		["99999999.99", 99_999_999.99]
	])("accepts %s", (text, value) => {
		expect(checkMoney(text)).toBe("ok")
		expect(parseMoney(text)).toBe(value)
	})

	it.each([
		"",
		" ",
		"0",
		"0.00",
		"-5",
		"+5",
		"12.345",
		"1,25",
		"1e3",
		".5",
		"5.",
		"abc"
	])("rejects %j as invalid", (text) => {
		expect(checkMoney(text)).toBe("invalid")
		expect(parseMoney(text)).toBeNull()
	})

	it("flags amounts above the limit", () => {
		expect(checkMoney("100000000")).toBe("tooLarge")
		expect(checkMoney("99999999.995")).toBe("invalid")
		expect(parseMoney("100000000")).toBeNull()
	})
})

describe("formatMoneyInput", () => {
	it.each([
		["", ""],
		["abc", ""],
		["0", ""],
		["00", ""],
		["1", "0.01"],
		["10", "0.10"],
		["100", "1.00"],
		["10050", "100.50"],
		["1005000", "10,050.00"],
		["100050000", "1,000,500.00"],
		["9999999999", "99,999,999.99"],
		["99999999999", "999,999,999.99"],
		["10000000000", "100,000,000.00"],
		["100.50", "100.50"],
		["1,050.00", "1,050.00"],
		["$ 25", "0.25"],
		["0025", "0.25"]
	])("turns %j into %j", (raw, formatted) => {
		expect(formatMoneyInput(raw)).toBe(formatted)
	})

	it("keeps reformatting stable as the user keeps typing or deletes", () => {
		expect(formatMoneyInput("100.50")).toBe("100.50")
		expect(formatMoneyInput("100.5")).toBe("10.05")
		expect(formatMoneyInput("10.0")).toBe("1.00")
	})

	it("never drops digits, so an amount over the limit is rejected instead of changed", () => {
		// 100,000,000.00 pasted in: it must not turn into a smaller valid amount
		const shown = formatMoneyInput("100000000.00")
		expect(shown).toBe("100,000,000.00")
		expect(checkMoney(shown)).toBe("tooLarge")
		expect(parseMoney(shown)).toBeNull()
		expect(checkMoney(formatMoneyInput("123456789012"))).toBe("tooLarge")
		// The largest amount still passes
		expect(checkMoney(formatMoneyInput("9999999999"))).toBe("ok")
	})

	it("always gives text that parseMoney accepts", () => {
		for (const raw of ["1", "50", "10050", "1005000", "9999999999"]) {
			expect(parseMoney(formatMoneyInput(raw))).not.toBeNull()
		}
	})
})
