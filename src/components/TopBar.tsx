"use client"

import { usePathname } from "next/navigation"
import { getPageTitle, MONTH_PATH } from "@/lib/navigation"

export function TopBar() {
	const pathname = usePathname()
	const title = getPageTitle(pathname)

	// The Month screen has no page title: its month switcher is the header
	if (pathname === MONTH_PATH) return null

	return (
		<div className="md:mx-auto md:flex md:w-full md:max-w-[1120px] md:shrink-0 md:items-center md:justify-between md:px-5 md:pb-6">
			<h1 className="px-5 pb-4 text-2xl font-bold tracking-tight text-foreground md:p-0">
				{title}
			</h1>
		</div>
	)
}
