import { notFound } from "next/navigation"
import { SettingsSection } from "@/components/settings/SettingsSection"
import { findSettingsSection, SETTINGS_SECTION_IDS } from "@/lib/navigation"

export const dynamicParams = false

export const generateStaticParams = () =>
	SETTINGS_SECTION_IDS.map((section) => ({ section }))

export default async function SettingsSectionPage({
	params
}: {
	params: Promise<{ section: string }>
}) {
	const { section } = await params
	if (!findSettingsSection(section)) notFound()
	return <SettingsSection />
}
