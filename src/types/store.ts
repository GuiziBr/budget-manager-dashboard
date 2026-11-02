import type { Id, IsoDate } from "./common"

export interface Store {
	id: Id
	name: string
	createdAt: IsoDate
	updatedAt: IsoDate
	deletedAt: null
}
