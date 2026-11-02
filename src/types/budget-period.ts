import type { Id, IsoDate } from "./common"

export interface BudgetPeriod {
	id: Id
	year: number
	month: number
	createdAt: IsoDate
	updatedAt: IsoDate
	deletedAt: null
}

export interface CreateBudgetPeriodInput {
	year: number
	month: number
}
