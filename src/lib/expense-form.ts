import { z } from "zod"
import { translations } from "@/constants/translations"
import { todayIso } from "@/lib/format-date"
import { checkMoney, parseMoney } from "@/lib/money"
import type {
	CreateInstallmentExpenseInput,
	CreateOneTimeExpenseInput,
	Id
} from "@/types"

const t = translations.month.form

/** What the form holds while it is being filled in: every field is text, `""` means empty. */
export type FormExpenseType = "one-time" | "installment"

/** Interval presets of an installment plan: monthly (30 days), every 2 weeks (14), or custom. */
export type IntervalPreset = "30" | "14" | "custom"

export interface ExpenseFormValues {
	type: FormExpenseType
	description: string
	categoryId: string
	paymentTypeId: string
	bankId: string
	storeId: string
	amount: string
	purchasedAt: string
	dueAt: string
	paidAt: string
	/** Installments: number of payments, the interval and the first purchase date. */
	installmentCount: string
	intervalPreset: IntervalPreset
	customIntervalDays: string
	firstPurchasedAt: string
}

export const EMPTY_EXPENSE_FORM: ExpenseFormValues = {
	type: "one-time",
	description: "",
	categoryId: "",
	paymentTypeId: "",
	bankId: "",
	storeId: "",
	amount: "",
	purchasedAt: "",
	dueAt: "",
	paidAt: "",
	installmentCount: "",
	intervalPreset: "30",
	customIntervalDays: "",
	firstPurchasedAt: ""
}

/** A fresh form for the next expense, keeping type, category, payment type and bank (Finish & add another). */
export function afterAddAnother(values: ExpenseFormValues): ExpenseFormValues {
	return {
		...EMPTY_EXPENSE_FORM,
		type: values.type,
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
			type: z.enum(["one-time", "installment"]),
			description: z.string().trim().min(1, t.validation.description),
			categoryId: z.string().min(1, t.validation.category),
			paymentTypeId: z.string().min(1, t.validation.paymentType),
			bankId: z.string(),
			storeId: z.string(),
			amount: z.string(),
			purchasedAt: z.string(),
			dueAt: z.string(),
			paidAt: z.string(),
			installmentCount: z.string(),
			intervalPreset: z.enum(["30", "14", "custom"]),
			customIntervalDays: z.string(),
			firstPurchasedAt: z.string()
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
			if (values.type === "one-time" && values.purchasedAt > today) {
				ctx.addIssue({
					code: "custom",
					path: ["purchasedAt"],
					message: translations.errors.futureDate
				})
			}
			if (values.type === "installment") {
				const count = parseWhole(values.installmentCount)
				if (count === null || count < 2) {
					ctx.addIssue({
						code: "custom",
						path: ["installmentCount"],
						message: t.validation.installmentCount
					})
				}
				if (
					values.intervalPreset === "custom" &&
					(parseWhole(values.customIntervalDays) ?? 0) < 1
				) {
					ctx.addIssue({
						code: "custom",
						path: ["customIntervalDays"],
						message: t.validation.interval
					})
				}
				if (!values.firstPurchasedAt) {
					ctx.addIssue({
						code: "custom",
						path: ["firstPurchasedAt"],
						message: t.validation.firstPurchase
					})
				} else if (values.firstPurchasedAt > today) {
					ctx.addIssue({
						code: "custom",
						path: ["firstPurchasedAt"],
						message: translations.errors.futureDate
					})
				}
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

/** A whole number of at least 1 typed as digits, or `null`. */
function parseWhole(input: string): number | null {
	return /^\d+$/.test(input.trim()) ? Number(input.trim()) : null
}

/** The payments of the plan being typed, or `null` while it isn't a valid plan. */
export function parsePlan(values: ExpenseFormValues): {
	amount: number
	count: number
	intervalDays: number
	firstPurchasedAt: string
} | null {
	const amount = parseMoney(values.amount)
	const count = parseWhole(values.installmentCount)
	const intervalDays =
		values.intervalPreset === "custom"
			? parseWhole(values.customIntervalDays)
			: Number(values.intervalPreset)
	if (
		amount === null ||
		count === null ||
		count < 2 ||
		intervalDays === null ||
		intervalDays < 1 ||
		!values.firstPurchasedAt
	) {
		return null
	}
	return {
		amount,
		count,
		intervalDays,
		firstPurchasedAt: values.firstPurchasedAt
	}
}

/** The `POST /expenses` body for the form: a one-time expense in the given month, or a plan. */
export function buildCreateExpenseInput(
	values: ExpenseFormValues,
	budgetPeriodId: Id
): CreateOneTimeExpenseInput | CreateInstallmentExpenseInput {
	if (values.type === "installment") {
		const plan = parsePlan(values)
		if (!plan) throw new Error("The plan is not valid")
		return {
			type: "installment",
			budgetPeriodId,
			categoryId: values.categoryId,
			paymentTypeId: values.paymentTypeId,
			bankId: values.bankId || null,
			storeId: values.storeId || null,
			description: values.description.trim(),
			amountPerInstallment: plan.amount,
			totalInstallments: plan.count,
			paymentIntervalDays: plan.intervalDays,
			firstPurchasedAt: plan.firstPurchasedAt
		}
	}
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
