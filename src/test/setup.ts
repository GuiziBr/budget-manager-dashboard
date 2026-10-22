import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Browser APIs that Radix primitives (Select, Dropdown, Tooltip) use and jsdom lacks
if (typeof Element !== "undefined") {
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	Element.prototype.hasPointerCapture ??= () => false
	Element.prototype.setPointerCapture ??= () => {}
	Element.prototype.releasePointerCapture ??= () => {}
	Element.prototype.scrollIntoView ??= () => {}
}

afterEach(cleanup)
