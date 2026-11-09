/** Distance of the floating button from the right and bottom edges of the screen, in px. */
export interface FabOffset {
	right: number
	bottom: number
}

export const FAB_SIZE = 56
export const FAB_MARGIN = 8
/** Clear of the bottom tab bar until the user moves it. */
export const FAB_DEFAULT: FabOffset = { right: 16, bottom: 96 }
/** How far a pointer must travel before a press counts as a drag, not a tap. */
export const FAB_DRAG_THRESHOLD = 6
export const FAB_KEY_STEP = 16
export const FAB_POSITION_KEY = "month.add-fab.position"

const clampAxis = (value: number, viewport: number) =>
	Math.min(
		Math.max(value, FAB_MARGIN),
		Math.max(FAB_MARGIN, viewport - FAB_SIZE - FAB_MARGIN)
	)

/** Keeps the whole button on screen. */
export const clampOffset = (
	offset: FabOffset,
	viewport: { width: number; height: number }
): FabOffset => ({
	right: clampAxis(offset.right, viewport.width),
	bottom: clampAxis(offset.bottom, viewport.height)
})

/** Reads a stored position, ignoring anything that isn't two finite numbers. */
export const parseOffset = (raw: string | null): FabOffset | null => {
	if (!raw) return null
	try {
		const value = JSON.parse(raw)
		if (
			Number.isFinite(value?.right) &&
			Number.isFinite(value?.bottom) &&
			typeof value.right === "number" &&
			typeof value.bottom === "number"
		) {
			return { right: value.right, bottom: value.bottom }
		}
	} catch {
		// Fall through to "no stored position".
	}
	return null
}
