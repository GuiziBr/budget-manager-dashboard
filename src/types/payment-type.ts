import type { Id, IsoDate } from "./common"

export interface PaymentType {
	id: Id
	name: string
	hasStatement: boolean
	createdAt: IsoDate
	updatedAt: IsoDate
	deletedAt: null
}
