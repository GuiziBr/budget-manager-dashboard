"use client"

import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { translations } from "@/constants/translations"
import { useBanks, useCreateBank } from "@/hooks/use-banks"
import { useCategories, useCreateCategory } from "@/hooks/use-categories"
import {
	useCreatePaymentType,
	usePaymentTypes
} from "@/hooks/use-payment-types"
import { useCreateStore, useStores } from "@/hooks/use-stores"
import { buildCreateLookupInput } from "@/lib/lookup-form"
import { SETTINGS_PATH, type SettingsSectionId } from "@/lib/navigation"
import { LookupList } from "./LookupList"

// One component per lookup, so each calls its own hooks unconditionally
function Categories() {
	const create = useCreateCategory()
	return (
		<LookupList
			lookup="category"
			query={useCategories()}
			create={(values) =>
				create.mutateAsync(buildCreateLookupInput("category", values) as never)
			}
		/>
	)
}
function PaymentTypes() {
	const create = useCreatePaymentType()
	return (
		<LookupList
			lookup="paymentType"
			query={usePaymentTypes()}
			create={(values) =>
				create.mutateAsync(
					buildCreateLookupInput("paymentType", values) as never
				)
			}
		/>
	)
}
function Banks() {
	const create = useCreateBank()
	return (
		<LookupList
			lookup="bank"
			query={useBanks()}
			create={(values) =>
				create.mutateAsync(buildCreateLookupInput("bank", values) as never)
			}
		/>
	)
}
function Stores() {
	const create = useCreateStore()
	return (
		<LookupList
			lookup="store"
			query={useStores()}
			create={(values) =>
				create.mutateAsync(buildCreateLookupInput("store", values) as never)
			}
		/>
	)
}

const SECTION_LISTS: Record<SettingsSectionId, () => React.JSX.Element> = {
	categories: Categories,
	"payment-types": PaymentTypes,
	banks: Banks,
	stores: Stores
}

/** One settings section: its lookup list. The forms arrive in later tasks (ST-06 on). */
export function SettingsSection({ section }: { section: SettingsSectionId }) {
	const List = SECTION_LISTS[section]
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
			<List />
		</main>
	)
}
