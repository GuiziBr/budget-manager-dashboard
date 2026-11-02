import type { Id, IsoDate } from "./common"

export interface Category {
	id: Id
	name: string
	hasBudgetEnvelope: boolean
	createdAt: IsoDate
	updatedAt: IsoDate
	deletedAt: null
}
