"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Tags } from "lucide-react"
import { type RefObject, useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { DetailsSheet } from "@/components/DetailsSheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FormField, fieldErrorId } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { translations } from "@/constants/translations"
import { ApiError } from "@/lib/api"
import { describeApiError } from "@/lib/api-error-message"
import {
	buildUpdateLookupInput,
	isDuplicateName,
	type LookupFormValues,
	type LookupItem,
	lookupFormSchema,
	lookupToFormValues,
	nameChanged
} from "@/lib/lookup-form"
import type { LookupKind } from "./LookupList"

const t = translations.settings.edit
const names = translations.errors.lookup.names
const flagLabel = translations.settings.list.flags
const flagHint = translations.settings.list.flagHints
const FLAG_FIELD = {
	category: "hasBudgetEnvelope",
	paymentType: "hasStatement"
} as const

interface LookupFormPanelProps {
	open: boolean
	onClose: () => void
	lookup: LookupKind
	/** The item being renamed. */
	item: LookupItem | null
	/** The list already loaded, for the duplicate check (S-14). */
	items: readonly LookupItem[]
	/** Re-reads the list; a local match is confirmed against it before it blocks. */
	reload: () => Promise<readonly LookupItem[] | undefined>
	/** Sends the changed fields; resolves when the list has been refreshed. */
	update: (item: LookupItem, changes: object) => Promise<unknown>
	returnFocusRef?: RefObject<HTMLElement | null>
	/** Gets the focus on close when the row's menu button is gone (the rename moved it off the page). */
	fallbackFocusRef?: RefObject<HTMLElement | null>
}

/**
 * Edit a lookup item (S-02, S-06, S-09, S-11): a panel from the right on desktop, a
 * full-height sheet on the phone. Same shell as the income and envelope forms.
 */
export function LookupFormPanel({
	open,
	onClose,
	lookup,
	item,
	items,
	reload,
	update,
	returnFocusRef,
	fallbackFocusRef
}: LookupFormPanelProps) {
	// While a save is in flight the panel stays, so the user sees whether it worked
	const [saving, setSaving] = useState(false)
	// Kept after close so the sheet doesn't go blank while it slides out
	const [shown, setShown] = useState(item)
	useEffect(() => {
		if (item) setShown(item)
	}, [item])

	return (
		<DetailsSheet
			open={open}
			onOpenChange={(next) => {
				if (!next && !saving) onClose()
			}}
			title={t.title.replace("{item}", names[lookup].item)}
			titleClassName="text-xl"
			separated
			description={t.description.replace("{name}", shown?.name ?? "")}
			returnFocusRef={returnFocusRef}
			fallbackFocusRef={fallbackFocusRef}
			fullHeight
			initialFocus="#lookup-name"
		>
			{shown && (
				<LookupForm
					// The sheet stays mounted while it closes and the form reads its defaults
					// only on mount: a new key gives each item a fresh form
					key={shown.id}
					lookup={lookup}
					item={shown}
					items={items}
					reload={reload}
					update={update}
					onClose={onClose}
					onSavingChange={setSaving}
				/>
			)}
		</DetailsSheet>
	)
}

function LookupForm({
	lookup,
	item,
	items,
	reload,
	update,
	onClose,
	onSavingChange
}: {
	lookup: LookupKind
	item: LookupItem
	items: readonly LookupItem[]
	reload: LookupFormPanelProps["reload"]
	update: LookupFormPanelProps["update"]
	onClose: () => void
	onSavingChange: (saving: boolean) => void
}) {
	const {
		register,
		control,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting }
	} = useForm<LookupFormValues>({
		resolver: zodResolver(lookupFormSchema),
		defaultValues: lookupToFormValues(lookup, item)
	})

	// Tells the panel to hold off dismissal (Close, Escape, outside click) during a save
	useEffect(() => {
		onSavingChange(isSubmitting)
		return () => onSavingChange(false)
	}, [isSubmitting, onSavingChange])

	const save = handleSubmit(async (values) => {
		const name = values.name.trim()
		const fail = (error: unknown) => {
			const described = describeApiError(error, {
				action: "saveLookup",
				lookup,
				name
			})
			if (described.field) setError("name", { message: described.message })
			toast.error(described.message)
		}

		const changes = buildUpdateLookupInput(lookup, values, item)
		// Nothing changed: the API rejects an empty body, so there is nothing to send
		if (!changes) {
			onClose()
			return
		}
		if (nameChanged(name, item) && isDuplicateName(name, items, item.id)) {
			// The list on screen may be stale: only a match that is still there blocks
			const fresh = await reload().catch(() => undefined)
			if (isDuplicateName(name, fresh ?? items, item.id)) {
				fail(new ApiError("", 409))
				return
			}
		}
		try {
			await update(item, changes)
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) {
				// Deleted meanwhile: say so, refresh the list and close
				toast.error(
					describeApiError(error, { action: "saveLookup", lookup, name })
						.message
				)
				await reload().catch(() => undefined)
				onClose()
				return
			}
			// The field keeps what was typed
			fail(error)
			return
		}
		toast.success(t.saved.replace("{name}", name))
		onClose()
	})

	const error = errors.name?.message
	const flagField =
		lookup === "category" || lookup === "paymentType"
			? FLAG_FIELD[lookup]
			: null

	return (
		<form noValidate onSubmit={save} className="flex min-h-0 flex-1 flex-col">
			<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
				<FormField id="lookup-name" label={t.nameLabel} required error={error}>
					<Input
						id="lookup-name"
						icon={Tags}
						autoComplete="off"
						aria-required="true"
						aria-invalid={!!error}
						aria-describedby={error ? fieldErrorId("lookup-name") : undefined}
						className={
							error ? "border-danger focus-within:border-danger" : undefined
						}
						{...register("name")}
					/>
				</FormField>
				{flagField && (
					<Controller
						control={control}
						name={flagField}
						render={({ field }) => (
							<div className="flex flex-col gap-1.5">
								<label
									htmlFor="lookup-edit-flag"
									className="flex min-h-11 cursor-pointer items-center gap-2 font-medium text-foreground text-sm"
								>
									<Checkbox
										id="lookup-edit-flag"
										checked={field.value}
										aria-describedby="lookup-edit-flag-hint"
										onCheckedChange={(checked) =>
											field.onChange(checked === true)
										}
									/>
									{flagLabel[lookup as keyof typeof flagLabel]}
								</label>
								<p
									id="lookup-edit-flag-hint"
									className="text-muted-foreground text-sm"
								>
									{flagHint[lookup as keyof typeof flagHint]}
								</p>
							</div>
						)}
					/>
				)}
			</div>
			<div className="flex shrink-0 flex-col gap-2 border-border border-t px-5 py-5">
				<Button type="submit" disabled={isSubmitting}>
					{t.save}
				</Button>
				<Button
					type="button"
					variant="outline"
					disabled={isSubmitting}
					onClick={onClose}
				>
					{t.cancel}
				</Button>
			</div>
		</form>
	)
}
