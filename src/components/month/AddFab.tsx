"use client"

import { Plus } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { translations } from "@/constants/translations"
import {
	clampOffset,
	FAB_DEFAULT,
	FAB_DRAG_THRESHOLD,
	FAB_KEY_STEP,
	FAB_POSITION_KEY,
	type FabOffset,
	parseOffset
} from "@/lib/fab-position"

interface AddFabProps {
	/** Opens the + Add menu (wired in T-26). Until then the button does nothing. */
	onAdd?: () => void
}

const viewport = () => ({
	width: window.innerWidth,
	height: window.innerHeight
})

const readOffset = (): FabOffset => {
	try {
		const stored = parseOffset(window.localStorage.getItem(FAB_POSITION_KEY))
		return clampOffset(stored ?? FAB_DEFAULT, viewport())
	} catch {
		return clampOffset(FAB_DEFAULT, viewport())
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
 * The phone's floating add button. Drag it anywhere on the page (or move it with the
 * arrow keys); the position is remembered on this device. The caller shows it only
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

	// Read after mount so the server and first client render agree
	useEffect(() => {
		setOffset(readOffset())
		const onResize = () =>
			setOffset((current) => clampOffset(current, viewport()))
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
		setOffset((latest) => {
			saveOffset(latest)
			return latest
		})
	}

	const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		const step = {
			ArrowLeft: { right: FAB_KEY_STEP, bottom: 0 },
			ArrowRight: { right: -FAB_KEY_STEP, bottom: 0 },
			ArrowUp: { right: 0, bottom: FAB_KEY_STEP },
			ArrowDown: { right: 0, bottom: -FAB_KEY_STEP }
		}[event.key]
		if (!step) return
		event.preventDefault()
		const next = clampOffset(
			{ right: offset.right + step.right, bottom: offset.bottom + step.bottom },
			viewport()
		)
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
			className={`fixed z-30 flex size-14 touch-none select-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${dragging ? "cursor-grabbing scale-105" : "cursor-grab"}`}
		>
			<Plus className="size-6" aria-hidden="true" />
		</button>
	)
}
