"use client"

import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal"
import { translations } from "@/constants/translations"
import {
	useBanks,
	useCreateBank,
	useDeleteBank,
	useUpdateBank
} from "@/hooks/use-banks"
import {
	useCategories,
	useCreateCategory,
	useDeleteCategory,
	useUpdateCategory
} from "@/hooks/use-categories"
import {
	useCreatePaymentType,
	useDeletePaymentType,
	usePaymentTypes,
	useUpdatePaymentType
} from "@/hooks/use-payment-types"
import {
	useCreateStore,
	useDeleteStore,
	useStores,
	useUpdateStore
} from "@/hooks/use-stores"
import { describeApiError } from "@/lib/api-error-message"
import { buildCreateLookupInput, type LookupItem } from "@/lib/lookup-form"
import { SETTINGS_PATH, type SettingsSectionId } from "@/lib/navigation"
import { LookupFormPanel } from "./LookupFormPanel"
import { type LookupKind, LookupList, type LookupQuery } from "./LookupList"

interface LookupSectionProps {
	lookup: LookupKind
	query: LookupQuery
	create: (input: never) => Promise<unknown>
	update: (input: { id: string } & object) => Promise<unknown>
	remove: (id: string) => Promise<unknown>
}

const t = translations.settings

/** A lookup's list and its edit panel; the section components below supply the hooks. */
function LookupSection({
	lookup,
	query,
	create,
	update,
	remove
}: LookupSectionProps) {
	const [editing, setEditing] = useState<LookupItem | null>(null)
	const [open, setOpen] = useState(false)
	const [deleting, setDeleting] = useState<LookupItem | null>(null)
	const [deletePending, setDeletePending] = useState(false)
	const openerRef = useRef<HTMLElement | null>(null)
	// The list's own container: where focus lands if the renamed row left the page
	const listRef = useRef<HTMLDivElement>(null)
	const names = translations.errors.lookup.names[lookup]

	// The dialog has no trigger of its own, so put the focus back by hand: on the row's
	// menu button, or on the list when the row is gone
	const restoreFocus = () =>
		setTimeout(() => {
			const opener = openerRef.current
			;(opener?.isConnected ? opener : listRef.current)?.focus()
		}, 0)
	const closeDelete = () => {
		setDeleting(null)
		restoreFocus()
	}

	const confirmDelete = async () => {
		if (!deleting) return
		const item = deleting
		setDeletePending(true)
		try {
			await remove(item.id)
			toast.success(t.remove.deleted.replace("{name}", () => item.name))
		} catch (error) {
			const described = describeApiError(error, {
				action: "deleteLookup",
				lookup,
				name: item.name
			})
			// Already gone counts as deleted: refresh quietly. Anything else says why
			if (described.kind === "alreadyDeleted") await query.refetch()
			else toast.error(described.message)
		} finally {
			setDeletePending(false)
			closeDelete()
		}
	}

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
				onDelete={(item, opener) => {
					openerRef.current = opener
					setDeleting(item)
				}}
			/>
			<ConfirmDeleteModal
				isOpen={deleting !== null}
				onClose={closeDelete}
				onConfirm={confirmDelete}
				title={t.remove.title.replace("{item}", names.item)}
				description={t.remove.confirm
					.replace("{item}", names.item)
					.replace("{name}", () => deleting?.name ?? "")}
				isPending={deletePending}
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
	const remove = useDeleteCategory()
	return (
		<LookupSection
			lookup="category"
			query={useCategories()}
			create={create.mutateAsync as LookupSectionProps["create"]}
			update={update.mutateAsync as LookupSectionProps["update"]}
			remove={remove.mutateAsync as LookupSectionProps["remove"]}
		/>
	)
}
function PaymentTypes() {
	const create = useCreatePaymentType()
	const update = useUpdatePaymentType()
	const remove = useDeletePaymentType()
	return (
		<LookupSection
			lookup="paymentType"
			query={usePaymentTypes()}
			create={create.mutateAsync as LookupSectionProps["create"]}
			update={update.mutateAsync as LookupSectionProps["update"]}
			remove={remove.mutateAsync as LookupSectionProps["remove"]}
		/>
	)
}
function Banks() {
	const create = useCreateBank()
	const update = useUpdateBank()
	const remove = useDeleteBank()
	return (
		<LookupSection
			lookup="bank"
			query={useBanks()}
			create={create.mutateAsync as LookupSectionProps["create"]}
			update={update.mutateAsync as LookupSectionProps["update"]}
			remove={remove.mutateAsync as LookupSectionProps["remove"]}
		/>
	)
}
function Stores() {
	const create = useCreateStore()
	const update = useUpdateStore()
	const remove = useDeleteStore()
	return (
		<LookupSection
			lookup="store"
			query={useStores()}
			create={create.mutateAsync as LookupSectionProps["create"]}
			update={update.mutateAsync as LookupSectionProps["update"]}
			remove={remove.mutateAsync as LookupSectionProps["remove"]}
		/>
	)
}

const SECTION_LISTS: Record<SettingsSectionId, () => React.JSX.Element> = {
	categories: Categories,
	"payment-types": PaymentTypes,
	banks: Banks,
	stores: Stores
}

/** One settings section: its lookup list. Edit (ST-06) and delete (ST-09) are here. */
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
