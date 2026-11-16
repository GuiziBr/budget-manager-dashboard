"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo, useRef } from "react"
import { parsePlanId, planHref } from "@/lib/selection-link"
import type { Id } from "@/types"

/**
 * The installment plan whose dialog is open, kept in the address (`?plan=<id>`)
 * so the link can be shared and the back button closes the dialog. It sits
 * beside `?expense=`, so the row's details stay behind it. Opening adds a
 * history entry; closing goes back to it when the dialog was opened on this
 * screen, and otherwise (a pasted link) just removes the param.
 */
export function useLinkedPlan() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const planId = useMemo(
		() => parsePlanId(new URLSearchParams(searchParams.toString())),
		[searchParams]
	)
	const openedHere = useRef(false)

	const open = useCallback(
		(id: Id) => {
			openedHere.current = true
			router.push(planHref(searchParams, id), { scroll: false })
		},
		[router, searchParams]
	)

	/** Removes the param without adding history; for a link to a plan that isn't there. */
	const clear = useCallback(() => {
		openedHere.current = false
		router.replace(planHref(searchParams, null), { scroll: false })
	}, [router, searchParams])

	const close = useCallback(() => {
		if (openedHere.current) {
			openedHere.current = false
			router.back()
		} else {
			clear()
		}
	}, [router, clear])

	return { planId, open, close, clear }
}
