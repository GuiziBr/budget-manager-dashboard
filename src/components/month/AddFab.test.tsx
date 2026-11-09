// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FAB_DEFAULT, FAB_POSITION_KEY } from "@/lib/fab-position"
import { AddFab } from "./AddFab"

const button = () => screen.getByRole("button", { name: "Add" })

beforeEach(() => {
	window.localStorage.clear()
	Object.defineProperty(window, "innerWidth", {
		value: 390,
		configurable: true
	})
	Object.defineProperty(window, "innerHeight", {
		value: 800,
		configurable: true
	})
	// jsdom has no pointer capture
	HTMLElement.prototype.setPointerCapture = vi.fn()
})

const drag = (dx: number, dy: number) => {
	fireEvent.pointerDown(button(), { button: 0, clientX: 300, clientY: 600 })
	fireEvent.pointerMove(button(), { clientX: 300 + dx, clientY: 600 + dy })
	fireEvent.pointerUp(button())
}

describe("AddFab", () => {
	it("is a labelled button that calls onAdd", async () => {
		const onAdd = vi.fn()
		render(<AddFab onAdd={onAdd} />)
		await userEvent.click(button())
		expect(onAdd).toHaveBeenCalledOnce()
	})

	it("does nothing without onAdd", async () => {
		render(<AddFab />)
		await userEvent.click(button())
		expect(button()).toBeInTheDocument()
	})

	it("starts at the default spot", () => {
		render(<AddFab />)
		expect(button()).toHaveStyle({
			right: `${FAB_DEFAULT.right}px`,
			bottom: `${FAB_DEFAULT.bottom}px`
		})
	})

	it("follows a drag and remembers the spot", () => {
		render(<AddFab />)
		drag(-100, -200)
		expect(button()).toHaveStyle({ right: "116px", bottom: "296px" })
		expect(window.localStorage.getItem(FAB_POSITION_KEY)).toBe(
			'{"right":116,"bottom":296}'
		)
	})

	it("keeps the button on screen and above the tab bar once released", () => {
		render(<AddFab />)
		drag(900, 900)
		expect(button()).toHaveStyle({ right: "8px", bottom: "88px" })
		expect(window.localStorage.getItem(FAB_POSITION_KEY)).toBe(
			'{"right":8,"bottom":88}'
		)
	})

	it("lets the button go over the tab bar while dragging, then lifts it on release", () => {
		render(<AddFab />)
		fireEvent.pointerDown(button(), { button: 0, clientX: 300, clientY: 600 })
		fireEvent.pointerMove(button(), { clientX: 300, clientY: 760 })
		expect(button()).toHaveStyle({ bottom: "8px" })
		fireEvent.pointerUp(button())
		expect(button()).toHaveStyle({ bottom: "88px" })
	})

	it("rests above the measured tab bar", () => {
		const bar = document.createElement("nav")
		bar.setAttribute("aria-label", "Primary")
		bar.getBoundingClientRect = () => ({ top: 700 }) as DOMRect
		document.body.append(bar)
		render(<AddFab />)
		drag(0, 900)
		// 800 - 700 + 8
		expect(button()).toHaveStyle({ bottom: "108px" })
		bar.remove()
	})

	it("doesn't move below the tab bar with the arrow keys", () => {
		render(<AddFab />)
		for (let i = 0; i < 10; i++)
			fireEvent.keyDown(button(), { key: "ArrowDown" })
		expect(button()).toHaveStyle({ bottom: "88px" })
	})

	it("doesn't open the menu after a drag, but does after the next tap", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true })
		const onAdd = vi.fn()
		render(<AddFab onAdd={onAdd} />)
		drag(-60, 0)
		fireEvent.click(button())
		expect(onAdd).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(5)
		fireEvent.click(button())
		expect(onAdd).toHaveBeenCalledOnce()
		vi.useRealTimers()
	})

	it("treats a tiny movement as a tap", () => {
		const onAdd = vi.fn()
		render(<AddFab onAdd={onAdd} />)
		drag(2, 2)
		fireEvent.click(button())
		expect(onAdd).toHaveBeenCalledOnce()
		expect(window.localStorage.getItem(FAB_POSITION_KEY)).toBeNull()
	})

	it("restores a stored position, clamped to the screen", () => {
		window.localStorage.setItem(FAB_POSITION_KEY, '{"right":20,"bottom":5000}')
		render(<AddFab />)
		expect(button()).toHaveStyle({ right: "20px", bottom: "736px" })
	})

	it("ignores a broken stored position", () => {
		window.localStorage.setItem(FAB_POSITION_KEY, "garbage")
		render(<AddFab />)
		expect(button()).toHaveStyle({
			right: `${FAB_DEFAULT.right}px`,
			bottom: `${FAB_DEFAULT.bottom}px`
		})
	})

	it("moves with the arrow keys", () => {
		render(<AddFab />)
		fireEvent.keyDown(button(), { key: "ArrowLeft" })
		fireEvent.keyDown(button(), { key: "ArrowUp" })
		expect(button()).toHaveStyle({ right: "32px", bottom: "112px" })
		fireEvent.keyDown(button(), { key: "ArrowRight" })
		fireEvent.keyDown(button(), { key: "ArrowDown" })
		expect(button()).toHaveStyle({ right: "16px", bottom: "96px" })
	})

	it("ignores other keys and non-primary buttons", () => {
		render(<AddFab />)
		fireEvent.keyDown(button(), { key: "a" })
		fireEvent.pointerDown(button(), { button: 2, clientX: 0, clientY: 0 })
		fireEvent.pointerMove(button(), { clientX: 100, clientY: 100 })
		expect(button()).toHaveStyle({ right: "16px", bottom: "96px" })
	})
})
