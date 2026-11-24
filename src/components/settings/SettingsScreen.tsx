"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { translations } from "@/constants/translations"
import {
	resolveSettingsTab,
	SETTINGS_TABS,
	settingsTabHref
} from "@/lib/settings-tabs"

export function SettingsScreen() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const tab = resolveSettingsTab(searchParams.get("tab"))
	const t = translations.settings

	return (
		<main className="mx-auto flex max-w-[1120px] flex-col gap-3 px-5 lg:h-full">
			<Tabs
				value={tab}
				// push (not replace) so the back button returns to the previous tab
				onValueChange={(value) =>
					router.push(settingsTabHref(resolveSettingsTab(value)))
				}
			>
				<TabsList aria-label={t.tabsLabel}>
					{SETTINGS_TABS.map((id) => (
						<TabsTrigger key={id} value={id} className="shrink-0">
							{t.tabs[id]}
						</TabsTrigger>
					))}
				</TabsList>
				{SETTINGS_TABS.map((id) => (
					<TabsContent key={id} value={id} />
				))}
			</Tabs>
		</main>
	)
}
