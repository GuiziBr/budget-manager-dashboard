import type { Id, IsoDate } from "./common"

export interface Bank {
	id: Id
	name: string
	createdAt: IsoDate
	updatedAt: IsoDate
	deletedAt: null
}
