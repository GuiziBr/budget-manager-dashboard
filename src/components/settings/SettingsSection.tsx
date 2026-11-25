"use client"

import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"
import { translations } from "@/constants/translations"
import { useBanks, useCreateBank, useUpdateBank } from "@/hooks/use-banks"
import {
	useCategories,
	useCreateCategory,
	useUpdateCategory
} from "@/hooks/use-categories"
import {
	useCreatePaymentType,
	usePaymentTypes,
	useUpdatePaymentType
} from "@/hooks/use-payment-types"
import { useCreateStore, useStores, useUpdateStore } from "@/hooks/use-stores"
import { buildCreateLookupInput, type LookupItem } from "@/lib/lookup-form"
import { SETTINGS_PATH, type SettingsSectionId } from "@/lib/navigation"
import { LookupFormPanel } from "./LookupFormPanel"
import { type LookupKind, LookupList, type LookupQuery } from "./LookupList"

interface LookupSectionProps {
	lookup: LookupKind
	query: LookupQuery
	create: (input: never) => Promise<unknown>
	update: (input: { id: string } & object) => Promise<unknown>
}

/** A lookup's list and its edit panel; the section components below supply the hooks. */
function LookupSection({ lookup, query, create, update }: LookupSectionProps) {
	const [editing, setEditing] = useState<LookupItem | null>(null)
	const [open, setOpen] = useState(false)
	const openerRef = useRef<HTMLElement | null>(null)
	// The list's own container: where focus lands if the renamed row left the page
	const listRef = useRef<HTMLDivElement>(null)
	return (
		<div ref={listRef} tabIndex={-1} className="outline-none">
			<LookupList
				lookup={lookup}
				query={query}
				create={(values) =>
					create(buildCreateLookupInput(lookup, values) as never)
				}
				onEdit={(item, opener) => {
					openerRef.current = opener
					setEditing(item)
					setOpen(true)
				}}
			/>
			<LookupFormPanel
				open={open}
				onClose={() => setOpen(false)}
				lookup={lookup}
				item={editing}
				items={query.data ?? []}
				reload={async () => (await query.refetch()).data}
				update={(item, changes) => update({ id: item.id, ...changes })}
				returnFocusRef={openerRef}
				fallbackFocusRef={listRef}
			/>
		</div>
	)
}

// One component per lookup, so each calls its own hooks unconditionally
function Categories() {
	const create = useCreateCategory()
	const update = useUpdateCategory()
	return (
		<LookupSection
			lookup="category"
			query={useCategories()}
			create={create.mutateAsync as LookupSectionProps["create"]}
			update={update.mutateAsync as LookupSectionProps["update"]}
		/>
	)
}
function PaymentTypes() {
	const create = useCreatePaymentType()
	const update = useUpdatePaymentType()
	return (
		<LookupSection
			lookup="paymentType"
			query={usePaymentTypes()}
			create={create.mutateAsync as LookupSectionProps["create"]}
			update={update.mutateAsync as LookupSectionProps["update"]}
		/>
	)
}
function Banks() {
	const create = useCreateBank()
	const update = useUpdateBank()
	return (
		<LookupSection
			lookup="bank"
			query={useBanks()}
			create={create.mutateAsync as LookupSectionProps["create"]}
			update={update.mutateAsync as LookupSectionProps["update"]}
		/>
	)
}
function Stores() {
	const create = useCreateStore()
	const update = useUpdateStore()
	return (
		<LookupSection
			lookup="store"
			query={useStores()}
			create={create.mutateAsync as LookupSectionProps["create"]}
			update={update.mutateAsync as LookupSectionProps["update"]}
		/>
	)
}

const SECTION_LISTS: Record<SettingsSectionId, () => React.JSX.Element> = {
	categories: Categories,
	"payment-types": PaymentTypes,
	banks: Banks,
	stores: Stores
}

/** One settings section: its lookup list. Edit is here (ST-06); delete arrives in ST-09. */
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
