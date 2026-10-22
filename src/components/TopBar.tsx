"use client"

import { usePathname } from "next/navigation"
import { getPageTitle } from "@/lib/navigation"

export function TopBar() {
	const title = getPageTitle(usePathname())

	return (
		<div className="md:mx-auto md:flex md:w-full md:max-w-[1120px] md:shrink-0 md:items-center md:justify-between md:px-5 md:pb-6">
			<h1 className="px-5 pb-4 text-2xl font-bold tracking-tight text-foreground md:p-0">
				{title}
			</h1>
		</div>
	)
}
