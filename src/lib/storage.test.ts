// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import {
	readStoredBoolean,
	readStoredString,
	subscribeToStorage,
	writeStoredBoolean,
	writeStoredString
} from "./storage"

afterEach(() => {
	vi.restoreAllMocks()
	window.localStorage.clear()
})

describe("storage", () => {
	it("returns the fallback when nothing or junk is stored", () => {
		expect(readStoredBoolean("k", true)).toBe(true)
		window.localStorage.setItem("k", "maybe")
		expect(readStoredBoolean("k", false)).toBe(false)
	})

	it("round-trips a boolean and notifies subscribers", () => {
		const listener = vi.fn()
		const unsubscribe = subscribeToStorage(listener)
		writeStoredBoolean("k", true)
		expect(readStoredBoolean("k", false)).toBe(true)
		writeStoredBoolean("k", false)
		expect(readStoredBoolean("k", true)).toBe(false)
		expect(listener).toHaveBeenCalledTimes(2)
		unsubscribe()
		writeStoredBoolean("k", true)
		expect(listener).toHaveBeenCalledTimes(2)
	})

	it("survives blocked storage", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked")
		})
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("blocked")
		})
		expect(readStoredBoolean("k", true)).toBe(true)
		expect(() => writeStoredBoolean("k", false)).not.toThrow()
	})
})

describe("string storage", () => {
	it("round-trips, removes on null and notifies subscribers", () => {
		const listener = vi.fn()
		const unsubscribe = subscribeToStorage(listener)
		expect(readStoredString("s")).toBeNull()
		writeStoredString("s", "dueAt:asc")
		expect(readStoredString("s")).toBe("dueAt:asc")
		writeStoredString("s", null)
		expect(readStoredString("s")).toBeNull()
		expect(listener).toHaveBeenCalledTimes(2)
		unsubscribe()
	})

	it("survives blocked storage", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked")
		})
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("blocked")
		})
		expect(readStoredString("s")).toBeNull()
		expect(() => writeStoredString("s", "x")).not.toThrow()
	})
})
