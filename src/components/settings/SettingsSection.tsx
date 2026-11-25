import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { translations } from "@/constants/translations"
import { SETTINGS_PATH } from "@/lib/navigation"

/** One settings section. The lists and forms arrive in later tasks (ST-05 on). */
export function SettingsSection() {
	return (
		<main className="mx-auto flex max-w-[1120px] flex-col gap-3 px-5 lg:h-full">
			{/* The phone has no sidebar, so the way back to the list is here */}
			<Link
				href={SETTINGS_PATH}
				className="inline-flex min-h-11 w-fit items-center gap-1 rounded-lg text-sm font-medium text-muted-foreground no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
			>
				<ChevronLeft className="size-4" aria-hidden="true" />
				{translations.settings.back}
			</Link>
		</main>
	)
}
