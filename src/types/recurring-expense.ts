import type { Id, IsoDate } from "./common"

export interface RecurringExpense {
	id: Id
	categoryId: Id
	paymentTypeId: Id
	bankId: Id | null
	storeId: Id | null
	description: string
	amount: number
	startedAt: IsoDate
	cancelledAt: IsoDate | null
	monthsAlreadyPaid: number
	createdAt: IsoDate
	updatedAt: IsoDate
	deletedAt: null
}
