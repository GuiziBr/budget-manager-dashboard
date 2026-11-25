"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Tags } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { translations } from "@/constants/translations"
import { ApiError } from "@/lib/api"
import { describeApiError } from "@/lib/api-error-message"
import {
	EMPTY_LOOKUP_FORM,
	isDuplicateName,
	type LookupFormValues,
	type LookupItem,
	lookupFormSchema
} from "@/lib/lookup-form"
import type { LookupKind } from "./LookupList"

interface LookupAddFormProps {
	lookup: LookupKind
	/** The list already loaded, for the duplicate check (S-14). */
	items: readonly LookupItem[]
	/** Re-reads the list; a local match is confirmed against it before it blocks. */
	reload: () => Promise<readonly LookupItem[] | undefined>
	/** Sends the new item; resolves when the list has been refreshed. */
	create: (values: LookupFormValues) => Promise<unknown>
}

const t = translations.settings
const FLAG_FIELD = {
	category: "hasBudgetEnvelope",
	paymentType: "hasStatement"
} as const

/** The section's "add a new item" row: a name, the lookup's flag if it has one, and Save. */
export function LookupAddForm({
	lookup,
	items,
	reload,
	create
}: LookupAddFormProps) {
	const {
		register,
		control,
		handleSubmit,
		reset,
		setError,
		formState: { errors, isSubmitting }
	} = useForm<LookupFormValues>({
		resolver: zodResolver(lookupFormSchema),
		defaultValues: EMPTY_LOOKUP_FORM
	})
	const flagField =
		lookup === "category" || lookup === "paymentType"
			? FLAG_FIELD[lookup]
			: null

	const fail = (name: string, error: unknown) => {
		const described = describeApiError(error, {
			action: "saveLookup",
			lookup,
			name
		})
		if (described.field) setError("name", { message: described.message })
		toast.error(described.message)
	}

	const submit = handleSubmit(async (values) => {
		const name = values.name.trim()
		if (isDuplicateName(name, items)) {
			// The list on screen may be stale: only a match that is still there blocks
			const fresh = await reload().catch(() => undefined)
			if (isDuplicateName(name, fresh ?? items)) {
				fail(name, new ApiError("", 409))
				return
			}
		}
		try {
			await create(values)
			toast.success(t.add.added.replace("{name}", name))
			reset(EMPTY_LOOKUP_FORM)
		} catch (error) {
			// The fields keep what was typed
			fail(name, error)
		}
	})

	const error = errors.name?.message

	return (
		<form
			onSubmit={submit}
			noValidate
			className="flex flex-col gap-3 sm:flex-row sm:items-center"
		>
			<Input
				icon={Tags}
				aria-label={t.add.nameLabel}
				aria-required="true"
				aria-invalid={!!error}
				placeholder={t.add.placeholders[lookup]}
				autoComplete="off"
				error={error}
				className="sm:flex-1"
				{...register("name")}
			/>
			{flagField && (
				<Controller
					control={control}
					name={flagField}
					render={({ field }) => (
						<label
							htmlFor="lookup-flag"
							className="flex min-h-11 cursor-pointer items-center gap-2 font-medium text-sm text-foreground sm:min-h-0"
						>
							<Checkbox
								id="lookup-flag"
								checked={field.value}
								onCheckedChange={(checked) => field.onChange(checked === true)}
							/>
							{t.list.flags[lookup as keyof typeof t.list.flags]}
						</label>
					)}
				/>
			)}
			<Button
				type="submit"
				disabled={isSubmitting}
				className="sm:ml-auto sm:min-w-28"
			>
				{translations.common.save}
			</Button>
		</form>
	)
}
