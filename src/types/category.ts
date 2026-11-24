import type { Id, IsoDate } from "./common"

export interface Category {
	id: Id
	name: string
	hasBudgetEnvelope: boolean
	createdAt: IsoDate
	updatedAt: IsoDate
	deletedAt: null
}

export interface CreateCategoryInput {
	name: string
	hasBudgetEnvelope: boolean
}

export interface UpdateCategoryInput {
	name?: string
	hasBudgetEnvelope?: boolean
}
