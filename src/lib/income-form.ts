import { z } from "zod"
import { translations } from "@/constants/translations"
import { checkMoney, formatMoneyInput, parseMoney } from "@/lib/money"
import type { CreateIncomeInput, Id, Income, UpdateIncomeInput } from "@/types"

const t = translations.month.income

/** What the income form holds while it is filled in: text fields, `""` means empty. */
export interface IncomeFormValues {
	description: string
	amount: string
	isSalary: boolean
	receivedAt: string
}

export const EMPTY_INCOME_FORM: IncomeFormValues = {
	description: "",
	amount: "",
	isSalary: false,
	receivedAt: ""
}

export const incomeFormSchema = z
	.object({
		description: z.string().trim().min(1, t.form.validation.description),
		amount: z.string(),
		isSalary: z.boolean(),
		receivedAt: z.string()
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

/** The `POST /incomes` body. Call it with values the schema accepted. */
export function buildCreateIncomeInput(
	values: IncomeFormValues,
	budgetPeriodId: Id
): CreateIncomeInput {
	const amount = parseMoney(values.amount)
	if (amount === null) throw new Error("The amount is not valid")
	return {
		budgetPeriodId,
		description: values.description.trim(),
		amount,
		isSalary: values.isSalary,
		...(values.receivedAt && { receivedAt: values.receivedAt })
	}
}

/** The form filled with an income's own values, for editing it. */
export function incomeToFormValues(income: Income): IncomeFormValues {
	return {
		description: income.description,
		amount: formatMoneyInput(String(Math.round(income.amount * 100))),
		isSalary: income.isSalary,
		receivedAt: income.receivedAt ? income.receivedAt.slice(0, 10) : ""
	}
}

/**
 * The `PATCH /incomes/:id` body: only the fields that changed (a cleared date goes as
 * `null`), or `null` when nothing changed, since the API rejects an empty body.
 */
export function buildUpdateIncomeInput(
	values: IncomeFormValues,
	income: Income
): UpdateIncomeInput | null {
	const before = incomeToFormValues(income)
	const input: UpdateIncomeInput = {}
	const description = values.description.trim()
	if (description !== before.description) input.description = description
	const amount = parseMoney(values.amount)
	if (
		amount !== null &&
		Math.round(amount * 100) !== Math.round(income.amount * 100)
	) {
		input.amount = amount
	}
	if (values.isSalary !== before.isSalary) input.isSalary = values.isSalary
	if (values.receivedAt !== before.receivedAt) {
		input.receivedAt = values.receivedAt || null
	}
	return Object.keys(input).length > 0 ? input : null
}

/** The confirmation text for deleting one income. */
export function incomeDeleteMessage(income: Income): string {
	return t.deleteConfirm.replace("{item}", income.description)
}
