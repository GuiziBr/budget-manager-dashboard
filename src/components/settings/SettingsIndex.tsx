import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { translations } from "@/constants/translations"
import { SETTINGS_SECTIONS } from "@/lib/navigation"

/** The list of sections: how the phone, which has no sidebar, reaches them. */
export function SettingsIndex() {
	return (
		<main className="mx-auto flex max-w-[1120px] flex-col gap-3 px-5 lg:h-full">
			<nav aria-label={translations.settings.sectionsLabel}>
				<ul className="divide-y divide-border rounded-xl border border-border bg-card">
					{SETTINGS_SECTIONS.map((section) => {
						const Icon = section.icon
						return (
							<li key={section.id}>
								<Link
									href={section.href}
									className="flex min-h-12 items-center justify-between px-4 text-sm font-medium text-foreground no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									<span className="flex items-center gap-3">
										<Icon
											className="size-4 text-muted-foreground"
											aria-hidden="true"
										/>
										{section.label}
									</span>
									<ChevronRight
										className="size-4 text-muted-foreground"
										aria-hidden="true"
									/>
								</Link>
							</li>
						)
					})}
				</ul>
			</nav>
		</main>
	)
}
