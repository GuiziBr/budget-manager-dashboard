"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo, useRef } from "react"
import type { Month } from "@/lib/month"
import {
	monthChangeHref,
	parseSelection,
	type Selection,
	selectionHref
} from "@/lib/selection-link"

/**
 * The expense or envelope whose details are open, kept in the address
 * (`?expense=<id>` or `?envelope=<id>`) so the link can be shared and the back
 * button closes the panel. Opening adds a history entry; closing goes back to
 * it when the panel was opened on this screen, and otherwise (a pasted link)
 * just removes the param without leaving the page. Moving to a neighbouring
 * row (`show`, optionally on another page) replaces the entry, so it doesn't
 * add steps to go back through.
 */
export function useLinkedSelection() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const selection = useMemo(
		() => parseSelection(new URLSearchParams(searchParams.toString())),
		[searchParams]
	)
	const openedHere = useRef(false)

	const open = useCallback(
		(next: Selection) => {
			openedHere.current = true
			router.push(selectionHref(searchParams, next), { scroll: false })
		},
		[router, searchParams]
	)

	/** Removes the param without adding history; for a link that points at nothing. */
	const clear = useCallback(() => {
		openedHere.current = false
		router.replace(selectionHref(searchParams, null), { scroll: false })
	}, [router, searchParams])

	/** Points the address at another row without adding history, so back still closes the panel. */
	const show = useCallback(
		(next: Selection, options?: { page?: number }) =>
			router.replace(selectionHref(searchParams, next, options), {
				scroll: false
			}),
		[router, searchParams]
	)

	const close = useCallback(() => {
		if (openedHere.current) {
			openedHere.current = false
			router.back()
		} else {
			clear()
		}
	}, [router, clear])

	/** Shows the month the linked row belongs to, in place, so back doesn't return to the wrong month. */
	const moveToMonth = useCallback(
		(month: Month) =>
			router.replace(monthChangeHref(searchParams, month), { scroll: false }),
		[router, searchParams]
	)

	return { selection, open, show, close, clear, moveToMonth }
}
