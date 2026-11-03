import type { Id, IsoDate } from "./common"

/**
 * `spentAmount` is `null` when the external spend API couldn't answer. `PATCH`
 * responses omit both spend fields, but the app never patches envelopes (M-22).
 */
export interface BudgetEnvelope {
	id: Id
	budgetPeriodId: Id
	categoryId: Id
	allocatedAmount: number
	spentAmount: number | null
	spendUpdatedAt: IsoDate | null
	createdAt: IsoDate
	updatedAt: IsoDate
	deletedAt: null
}

/** There is no update input: budgets are read-only in the app (M-22). */
export interface CreateEnvelopeInput {
	budgetPeriodId: Id
	categoryId: Id
	allocatedAmount: number
}
