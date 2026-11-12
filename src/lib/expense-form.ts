import { z } from "zod"
import { translations } from "@/constants/translations"
import { todayIso } from "@/lib/format-date"
import { checkMoney, parseMoney } from "@/lib/money"
import type { CreateOneTimeExpenseInput, Id } from "@/types"

const t = translations.month.form

/** What the form holds while it is being filled in: every field is text, `""` means empty. */
export interface ExpenseFormValues {
	description: string
	categoryId: string
	paymentTypeId: string
	bankId: string
	storeId: string
	amount: string
	purchasedAt: string
	dueAt: string
	paidAt: string
}

export const EMPTY_EXPENSE_FORM: ExpenseFormValues = {
	description: "",
	categoryId: "",
	paymentTypeId: "",
	bankId: "",
	storeId: "",
	amount: "",
	purchasedAt: "",
	dueAt: "",
	paidAt: ""
}

/** A fresh form for the next expense, keeping category, payment type and bank (Finish & add another). */
export function afterAddAnother(values: ExpenseFormValues): ExpenseFormValues {
	return {
		...EMPTY_EXPENSE_FORM,
		categoryId: values.categoryId,
		paymentTypeId: values.paymentTypeId,
		bankId: values.bankId
	}
}

/**
 * Validation for the one-time expense form. The bank is only required when the chosen
 * payment type has a statement, which the caller answers (the types come from the API).
 * The purchase date can't be after `today` ("YYYY-MM-DD", UTC like the API's).
 */
export function createExpenseFormSchema(
	requiresBank: (paymentTypeId: string) => boolean,
	today: string = todayIso()
) {
	return z
		.object({
			description: z.string().trim().min(1, t.validation.description),
			categoryId: z.string().min(1, t.validation.category),
			paymentTypeId: z.string().min(1, t.validation.paymentType),
			bankId: z.string(),
			storeId: z.string(),
			amount: z.string(),
			purchasedAt: z.string(),
			dueAt: z.string(),
			paidAt: z.string()
		})
		.superRefine((values, ctx) => {
			const amount = checkMoney(values.amount)
			if (amount !== "ok") {
				ctx.addIssue({
					code: "custom",
					path: ["amount"],
					message:
						amount === "tooLarge"
							? t.validation.amountTooLarge
							: t.validation.amount
				})
			}
			if (values.purchasedAt > today) {
				ctx.addIssue({
					code: "custom",
					path: ["purchasedAt"],
					message: translations.errors.futureDate
				})
			}
			if (
				values.paymentTypeId &&
				!values.bankId &&
				requiresBank(values.paymentTypeId)
			) {
				ctx.addIssue({
					code: "custom",
					path: ["bankId"],
					message: translations.errors.bankRequired
				})
			}
		})
}

/** The `POST /expenses` body for a one-time expense in the given month. */
export function buildCreateExpenseInput(
	values: ExpenseFormValues,
	budgetPeriodId: Id
): CreateOneTimeExpenseInput {
	const amount = parseMoney(values.amount)
	if (amount === null) throw new Error("The amount is not valid")
	return {
		type: "one-time",
		budgetPeriodId,
		categoryId: values.categoryId,
		paymentTypeId: values.paymentTypeId,
		bankId: values.bankId || null,
		storeId: values.storeId || null,
		description: values.description.trim(),
		amount,
		...(values.purchasedAt && { purchasedAt: values.purchasedAt }),
		...(values.dueAt && { dueAt: values.dueAt }),
		...(values.paidAt && { paidAt: values.paidAt })
	}
}
