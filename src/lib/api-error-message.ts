import { translations } from "@/constants/translations"
import { ApiError } from "./api"

const { errors } = translations

/** Backend texts of the two plain-string 400s (docs/APIs/expense.md). */
const BANK_REQUIRED_TEXT = "bankId is required for this payment type"
const NO_PERIOD_TEXT = "No matching budget periods found"
const FUTURE_DATE_TEXT = "Date cannot be in the future"

/** What the user was doing; the same status means different things per action. */
export type ApiErrorContext =
	| { action: "openMonth"; month: string }
	| { action: "deleteMonth" }
	| { action: "createEnvelope"; category: string }
	| { action: "updateEnvelope" }
	| { action: "deleteEnvelope" }
	| { action: "saveExpense" }
	| { action: "changePlanAmount" }
	| { action: "saveLookup"; lookup: LookupField; name: string }
	| { action: "deleteLookup"; lookup: LookupField; name: string }
	| { action: "mutate" }

export type ApiErrorKind =
	| "duplicateName"
	| "inUse"
	| "lookupItemGone"
	| "alreadyDeleted"
	| "monthExists"
	| "monthNotEmpty"
	| "envelopeExists"
	| "bankRequired"
	| "noPeriodForInstallments"
	| "futureDate"
	| "lookupGone"
	| "planGone"
	| "envelopeGone"
	| "monthClosed"
	| "generic"

export type LookupField = "category" | "paymentType" | "bank" | "store"

export type ApiErrorField = LookupField | "purchasedAt"

export interface DescribedApiError {
	kind: ApiErrorKind
	message: string
	/** The form field to attach the message to, for `bankRequired`, `futureDate`, and `lookupGone`. */
	field?: ApiErrorField
}

/** The contexts of the Settings lists. */
export type LookupErrorContext = Extract<
	ApiErrorContext,
	{ action: "saveLookup" | "deleteLookup" }
>

/** What a Settings error says; `duplicateName` points at the form's Name field. */
export interface DescribedLookupError {
	kind: ApiErrorKind
	message: string
	field?: "name"
}

const LOOKUP_ENTITIES: Record<string, LookupField> = {
	Category: "category",
	PaymentType: "paymentType",
	Bank: "bank",
	Store: "store"
}

function fill(template: string, values: Record<string, string>): string {
	return template.replace(/\{(\w+)\}/g, (match, key: string) =>
		key in values ? values[key] : match
	)
}

function generic(): DescribedApiError {
	return { kind: "generic", message: errors.generic }
}

/** Reads the lookup from "<Entity> with id <id> not found"; other 404s give `undefined`. */
function lookupField(message: string): LookupField | undefined {
	const entity = /^(\w+) with id .+ not found/.exec(message)?.[1]
	return entity ? LOOKUP_ENTITIES[entity] : undefined
}

export function isMonthClosedError(error: unknown): boolean {
	return error instanceof ApiError && error.status === 422
}

/** A 404 on a lookup delete: it is already gone, which counts as deleted. */
export function isAlreadyDeleted(error: unknown): boolean {
	return error instanceof ApiError && error.status === 404
}

function describeLookupError(
	error: unknown,
	context: LookupErrorContext
): DescribedLookupError {
	const { lookup, name } = context
	const names = errors.lookup.names[lookup]
	const status = error instanceof ApiError ? error.status : undefined

	if (context.action === "saveLookup") {
		if (status === 409) {
			return {
				kind: "duplicateName",
				message: fill(errors.lookup.duplicateName, {
					aItem: names.withArticle,
					name
				}),
				field: "name"
			}
		}
		if (status === 404) {
			return {
				kind: "lookupItemGone",
				message: fill(errors.lookup.itemGone, { item: names.item })
			}
		}
		return {
			kind: "generic",
			message: fill(errors.lookup.saveFailed, { item: names.item })
		}
	}

	if (status === 409) {
		const template =
			lookup === "category" ? errors.lookup.inUseCategory : errors.lookup.inUse
		return { kind: "inUse", message: fill(template, { name }) }
	}
	if (status === 404) return { kind: "alreadyDeleted", message: "" }
	return {
		kind: "generic",
		message: fill(errors.lookup.deleteFailed, { item: names.item })
	}
}

/**
 * Maps a backend error to the message in the Month spec §4, using what the user was
 * doing to tell apart responses that share a status. Anything unmatched, including
 * network failures, gives the generic message and never the raw backend text.
 */
export function describeApiError(
	error: unknown,
	context: LookupErrorContext
): DescribedLookupError
export function describeApiError(
	error: unknown,
	context: Exclude<ApiErrorContext, LookupErrorContext>
): DescribedApiError
export function describeApiError(
	error: unknown,
	context: ApiErrorContext
): DescribedApiError | DescribedLookupError
export function describeApiError(
	error: unknown,
	context: ApiErrorContext
): DescribedApiError | DescribedLookupError {
	if (context.action === "saveLookup" || context.action === "deleteLookup") {
		return describeLookupError(error, context)
	}

	if (!(error instanceof ApiError)) return generic()

	const { status, message } = error

	if (status === 422) {
		return { kind: "monthClosed", message: errors.monthClosed }
	}

	if (status === 409) {
		switch (context.action) {
			case "openMonth":
				return {
					kind: "monthExists",
					message: fill(errors.monthExists, { month: context.month })
				}
			case "deleteMonth":
				return { kind: "monthNotEmpty", message: errors.monthNotEmpty }
			case "createEnvelope":
				return {
					kind: "envelopeExists",
					message: fill(errors.envelopeExists, {
						category: context.category
					})
				}
			default:
				return generic()
		}
	}

	if (
		context.action === "updateEnvelope" ||
		context.action === "deleteEnvelope"
	) {
		return status === 404
			? { kind: "envelopeGone", message: errors.envelopeGone }
			: generic()
	}

	if (context.action === "changePlanAmount") {
		return status === 404
			? { kind: "planGone", message: errors.planGone }
			: generic()
	}

	if (context.action !== "saveExpense") return generic()

	if (status === 400) {
		if (message.includes(BANK_REQUIRED_TEXT)) {
			return {
				kind: "bankRequired",
				message: errors.bankRequired,
				field: "bank"
			}
		}
		if (message.includes(FUTURE_DATE_TEXT)) {
			return {
				kind: "futureDate",
				message: errors.futureDate,
				field: "purchasedAt"
			}
		}
		if (message.includes(NO_PERIOD_TEXT)) {
			return {
				kind: "noPeriodForInstallments",
				message: errors.noPeriodForInstallments
			}
		}
	}

	if (status === 404) {
		const field = lookupField(message)
		if (field) {
			return {
				kind: "lookupGone",
				message: fill(errors.lookupGone, { field: errors.fields[field] }),
				field
			}
		}
	}

	return generic()
}

export function getApiErrorMessage(
	error: unknown,
	context: ApiErrorContext
): string {
	return describeApiError(error, context).message
}
