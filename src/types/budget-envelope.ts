import type { Id, IsoDate } from "./common"

/** Allocation only: the API returns no actual spend (gap G-5). */
export interface BudgetEnvelope {
	id: Id
	budgetPeriodId: Id
	categoryId: Id
	allocatedAmount: number
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
