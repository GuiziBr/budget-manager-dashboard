"use client"

import { Plus } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"
import { translations } from "@/constants/translations"
import {
	clampOffset,
	FAB_DEFAULT,
	FAB_DRAG_THRESHOLD,
	FAB_KEY_STEP,
	FAB_MARGIN,
	FAB_POSITION_KEY,
	FAB_TAB_BAR_FALLBACK,
	type FabOffset,
	parseOffset,
	sideOffset,
	snapToSide
} from "@/lib/fab-position"

interface AddFabProps {
	/** Opens the + Add menu (wired in T-26). Until then the button does nothing. */
	onAdd?: () => void
}

const viewport = () => ({
	width: window.innerWidth,
	height: window.innerHeight
})

/** The lowest the button may rest: just above the bottom tab bar. */
const restingMinBottom = () => {
	const bar = document.querySelector(
		`nav[aria-label="${translations.navigation.tabBarLabel}"]`
	)
	const top = bar?.getBoundingClientRect().top
	if (top === undefined || top <= 0) return FAB_TAB_BAR_FALLBACK
	return window.innerHeight - top + FAB_MARGIN
}

/** A position the button can rest at: against the closest side, on screen and clear of the tab bar. */
const settle = (offset: FabOffset) => {
	const { width, height } = viewport()
	return clampOffset(
		snapToSide(clampOffset(offset, { width, height }), width),
		{ width, height },
		restingMinBottom()
	)
}

const readOffset = (): FabOffset => {
	try {
		return settle(
			parseOffset(window.localStorage.getItem(FAB_POSITION_KEY)) ?? FAB_DEFAULT
		)
	} catch {
		return settle(FAB_DEFAULT)
	}
}

const saveOffset = (offset: FabOffset) => {
	try {
		window.localStorage.setItem(FAB_POSITION_KEY, JSON.stringify(offset))
	} catch {
		// Storage can be blocked; the position still holds until reload.
	}
}

/**
 * The phone's floating add button. Drag it anywhere, and it settles against the closest
 * side when let go (the arrow keys switch sides or move it up and down); the position is remembered on this device. The caller shows it only
 * where editing is allowed.
 */
export function AddFab({ onAdd }: AddFabProps) {
	const [offset, setOffset] = useState<FabOffset>(FAB_DEFAULT)
	const [dragging, setDragging] = useState(false)
	const drag = useRef<{
		x: number
		y: number
		start: FabOffset
		moved: boolean
	} | null>(null)
	const justDragged = useRef(false)

	// Read before the first paint, so a saved position doesn't animate in from the default spot
	useLayoutEffect(() => {
		setOffset(readOffset())
		const onResize = () => setOffset(settle)
		window.addEventListener("resize", onResize)
		return () => window.removeEventListener("resize", onResize)
	}, [])

	const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
		if (event.button !== 0) return
		event.currentTarget.setPointerCapture(event.pointerId)
		drag.current = {
			x: event.clientX,
			y: event.clientY,
			start: offset,
			moved: false
		}
	}

	const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
		const current = drag.current
		if (!current) return
		const dx = event.clientX - current.x
		const dy = event.clientY - current.y
		if (!current.moved && Math.hypot(dx, dy) < FAB_DRAG_THRESHOLD) return
		current.moved = true
		setDragging(true)
		// The offsets are measured from the right and bottom edges, so they shrink as the pointer goes right or down
		setOffset(
			clampOffset(
				{ right: current.start.right - dx, bottom: current.start.bottom - dy },
				viewport()
			)
		)
	}

	const endDrag = () => {
		const current = drag.current
		drag.current = null
		setDragging(false)
		if (!current?.moved) return
		// The click that follows a drag must not open the menu
		justDragged.current = true
		setTimeout(() => {
			justDragged.current = false
		}, 0)
		// Let go: slide to the closest side, and up to just above the tab bar if it is over it
		const resting = settle(offset)
		setOffset(resting)
		saveOffset(resting)
	}

	const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		const width = viewport().width
		const move = {
			ArrowLeft: { right: sideOffset("left", width), bottom: offset.bottom },
			ArrowRight: { right: sideOffset("right", width), bottom: offset.bottom },
			ArrowUp: { right: offset.right, bottom: offset.bottom + FAB_KEY_STEP },
			ArrowDown: { right: offset.right, bottom: offset.bottom - FAB_KEY_STEP }
		}[event.key]
		if (!move) return
		event.preventDefault()
		const next = settle(move)
		setOffset(next)
		saveOffset(next)
	}

	return (
		<button
			type="button"
			onClick={() => {
				if (!justDragged.current) onAdd?.()
			}}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={endDrag}
			onPointerCancel={endDrag}
			onKeyDown={onKeyDown}
			aria-label={translations.month.table.addButton}
			aria-description={translations.month.table.addButtonHint}
			style={{ right: offset.right, bottom: offset.bottom }}
			className={`fixed z-30 flex size-14 touch-none select-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${dragging ? "cursor-grabbing scale-105" : "cursor-grab transition-[bottom,right,transform] duration-200"}`}
		>
			<Plus className="size-6" aria-hidden="true" />
		</button>
	)
}
