import { z } from "zod"
import { translations } from "@/constants/translations"
import type {
	Bank,
	Category,
	CreateBankInput,
	CreateCategoryInput,
	CreatePaymentTypeInput,
	CreateStoreInput,
	PaymentType,
	Store,
	UpdateBankInput,
	UpdateCategoryInput,
	UpdatePaymentTypeInput,
	UpdateStoreInput
} from "@/types"
import type { LookupField } from "./api-error-message"

const t = translations.settings.form

export type LookupItem = Category | PaymentType | Bank | Store

/** What the lookup form holds while it is filled in. */
export interface LookupFormValues {
	name: string
	hasBudgetEnvelope: boolean
	hasStatement: boolean
}

export const EMPTY_LOOKUP_FORM: LookupFormValues = {
	name: "",
	hasBudgetEnvelope: false,
	hasStatement: false
}

/** No maximum length: the API documents none (G-15). */
export const lookupFormSchema = z.object({
	name: z.string().trim().min(1, t.validation.name),
	hasBudgetEnvelope: z.boolean(),
	hasStatement: z.boolean()
})

function normalize(name: string): string {
	return name.trim().toLowerCase()
}

/**
 * Whether another item already has this name, ignoring case and surrounding spaces.
 * Stricter than the server's exact match on purpose (S-14). The item being edited is
 * skipped through `ignoreId`.
 */
export function isDuplicateName(
	name: string,
	items: readonly { id: string; name: string }[],
	ignoreId?: string
): boolean {
	const wanted = normalize(name)
	return items.some(
		(item) => item.id !== ignoreId && normalize(item.name) === wanted
	)
}

/** Whether the typed name differs from the item's; only then is the duplicate check run. */
export function nameChanged(name: string, item: { name: string }): boolean {
	return name.trim() !== item.name
}

/** The form filled with an item's own values, for editing it. */
export function lookupToFormValues(
	lookup: LookupField,
	item: LookupItem
): LookupFormValues {
	return {
		name: item.name,
		hasBudgetEnvelope:
			lookup === "category" && (item as Category).hasBudgetEnvelope,
		hasStatement: lookup === "paymentType" && (item as PaymentType).hasStatement
	}
}

type CreateLookupInput =
	| CreateCategoryInput
	| CreatePaymentTypeInput
	| CreateBankInput
	| CreateStoreInput

type UpdateLookupInput =
	| UpdateCategoryInput
	| UpdatePaymentTypeInput
	| UpdateBankInput
	| UpdateStoreInput

/** The `POST` body: every field the API requires, the flag as `false` when off. */
export function buildCreateLookupInput(
	lookup: LookupField,
	values: LookupFormValues
): CreateLookupInput {
	const name = values.name.trim()
	if (lookup === "category") {
		return { name, hasBudgetEnvelope: values.hasBudgetEnvelope }
	}
	if (lookup === "paymentType") {
		return { name, hasStatement: values.hasStatement }
	}
	return { name }
}

/**
 * The `PATCH` body: only the fields that changed, or `null` when nothing changed so the
 * caller closes without a request (the API rejects an empty body).
 */
export function buildUpdateLookupInput(
	lookup: LookupField,
	values: LookupFormValues,
	item: LookupItem
): UpdateLookupInput | null {
	const before = lookupToFormValues(lookup, item)
	const input: UpdateCategoryInput & UpdatePaymentTypeInput = {}
	const name = values.name.trim()
	if (name !== before.name) input.name = name
	if (
		lookup === "category" &&
		values.hasBudgetEnvelope !== before.hasBudgetEnvelope
	) {
		input.hasBudgetEnvelope = values.hasBudgetEnvelope
	}
	if (lookup === "paymentType" && values.hasStatement !== before.hasStatement) {
		input.hasStatement = values.hasStatement
	}
	return Object.keys(input).length > 0 ? input : null
}

/** A new list sorted alphabetically, ignoring case. */
export function sortLookups<T extends { name: string }>(
	items: readonly T[]
): T[] {
	return [...items].sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
	)
}
