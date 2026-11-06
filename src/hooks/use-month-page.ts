"use client"

import { useRouter, useSearchParams } from "next/navigation"

/** `?page=` as a page number: anything that isn't a whole number from 1 up is page 1. */
export function parsePage(value: string | null): number {
	const page = Number(value)
	return Number.isInteger(page) && page >= 1 ? page : 1
}

/**
 * The table's page, kept in the address next to `?period=` so a reload or the
 * back button lands on the same page. Page 1 leaves the address clean.
 * `setPage` adds a history entry; `replacePage` fixes the address in place
 * (for a page that no longer exists).
 */
export function useMonthPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const page = parsePage(searchParams.get("page"))

	const hrefFor = (target: number) => {
		const params = new URLSearchParams(searchParams.toString())
		if (target <= 1) params.delete("page")
		else params.set("page", String(target))
		return `?${params.toString()}`
	}

	return {
		page,
		setPage: (target: number) =>
			router.push(hrefFor(target), { scroll: false }),
		replacePage: (target: number) =>
			router.replace(hrefFor(target), { scroll: false })
	}
}
