"use client"

import { useSyncExternalStore } from "react"

/** Whether a CSS media query matches. False where `matchMedia` doesn't exist (server, tests). */
export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		(onChange) => {
			if (typeof window === "undefined" || !window.matchMedia) return () => {}
			const list = window.matchMedia(query)
			list.addEventListener("change", onChange)
			return () => list.removeEventListener("change", onChange)
		},
		() =>
			typeof window !== "undefined" && window.matchMedia
				? window.matchMedia(query).matches
				: false,
		() => false
	)
}

/** Below the `lg` breakpoint (1024px), where the Month screen switches to its phone layout. */
export const PHONE_QUERY = "(max-width: 1023.98px)"
