import { useEffect } from "react"

/**
 * Up and Down call `onPrevious` and `onNext` while `enabled`. A direction with
 * no handler is left alone (so the key still scrolls), and so are arrows typed
 * inside a field, with a modifier held, or already handled.
 */
export function useArrowKeyNavigation(
	enabled: boolean,
	onPrevious: (() => void) | undefined,
	onNext: (() => void) | undefined
) {
	useEffect(() => {
		if (!enabled) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
			if (event.defaultPrevented) return
			if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
				return
			const target = event.target
			if (
				target instanceof HTMLElement &&
				target.closest(
					"input, textarea, select, [contenteditable], [role=listbox], [role=menu], [role=slider]"
				)
			)
				return
			const step = event.key === "ArrowUp" ? onPrevious : onNext
			if (!step) return
			event.preventDefault()
			step()
		}
		window.addEventListener("keydown", onKeyDown)
		return () => window.removeEventListener("keydown", onKeyDown)
	}, [enabled, onPrevious, onNext])
}
