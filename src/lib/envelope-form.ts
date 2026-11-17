import { z } from "zod"
import { translations } from "@/constants/translations"
import { checkMoney, formatMoneyInput, parseMoney } from "@/lib/money"
import type {
	BudgetEnvelope,
	Category,
	CreateEnvelopeInput,
	Id,
	UpdateEnvelopeInput
} from "@/types"

const t = translations.month.envelopes

/** What the envelope form holds while it is filled in: text fields, `""` means empty. */
export interface EnvelopeFormValues {
	categoryId: string
	amount: string
}

export const EMPTY_ENVELOPE_FORM: EnvelopeFormValues = {
	categoryId: "",
	amount: ""
}

export const envelopeFormSchema = z
	.object({
		categoryId: z.string().min(1, t.form.validation.category),
		amount: z.string()
	})
	.superRefine((values, ctx) => {
		const amount = checkMoney(values.amount)
		if (amount !== "ok") {
			ctx.addIssue({
				code: "custom",
				path: ["amount"],
				message:
					amount === "tooLarge"
						? t.form.validation.amountTooLarge
						: t.form.validation.amount
			})
		}
	})

/** The `POST /budget-envelopes` body. Call it with values the schema accepted. */
export function buildCreateEnvelopeInput(
	values: EnvelopeFormValues,
	budgetPeriodId: Id
): CreateEnvelopeInput {
	const allocatedAmount = parseMoney(values.amount)
	if (allocatedAmount === null) throw new Error("The amount is not valid")
	return { budgetPeriodId, categoryId: values.categoryId, allocatedAmount }
}

/** The form filled with an envelope's own values, for editing its budget. */
export function envelopeToFormValues(
	envelope: BudgetEnvelope
): EnvelopeFormValues {
	return {
		categoryId: envelope.categoryId,
		amount: formatMoneyInput(String(Math.round(envelope.allocatedAmount * 100)))
	}
}

/**
 * The `PATCH /budget-envelopes/:id` body, or `null` when the budget didn't change,
 * since the API rejects an empty body.
 */
export function buildUpdateEnvelopeInput(
	values: EnvelopeFormValues,
	envelope: BudgetEnvelope
): UpdateEnvelopeInput | null {
	const amount = parseMoney(values.amount)
	if (
		amount === null ||
		Math.round(amount * 100) === Math.round(envelope.allocatedAmount * 100)
	) {
		return null
	}
	return { allocatedAmount: amount }
}

/**
 * The categories an envelope can still be added for: they use envelopes and don't have
 * one this month. Sorted by name.
 */
export function availableEnvelopeCategories(
	categories: Category[],
	envelopes: BudgetEnvelope[]
): Category[] {
	const used = new Set(envelopes.map((envelope) => envelope.categoryId))
	return categories
		.filter((category) => category.hasBudgetEnvelope && !used.has(category.id))
		.sort((a, b) => a.name.localeCompare(b.name))
}

/** The confirmation text for deleting one envelope. A category that is gone has no name (G-12). */
export function envelopeDeleteMessage(categoryName: string | null): string {
	return t.deleteConfirm.replace(
		"{category}",
		categoryName ?? translations.month.details.deleted
	)
}
