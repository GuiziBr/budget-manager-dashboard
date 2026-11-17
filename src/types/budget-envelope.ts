import type { Id, IsoDate } from "./common"

/**
 * `spentAmount` is `null` when the external spend API couldn't answer. `PATCH`
 * responses omit both spend fields, so a cached envelope is never overwritten with one
 * (the list is refetched instead).
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

export interface CreateEnvelopeInput {
	budgetPeriodId: Id
	categoryId: Id
	allocatedAmount: number
}

/** Only the budget can change (M-22). */
export interface UpdateEnvelopeInput {
	allocatedAmount: number
}
