import type { Id, IsoDate } from "./common"

export interface InstallmentGroup {
	id: Id
	description: string
	amountPerInstallment: number
	totalInstallments: number
	paymentIntervalDays: number
	firstPurchasedAt: IsoDate
	createdAt: IsoDate
	updatedAt: IsoDate
	deletedAt: null
}

export interface UpdateInstallmentGroupInput {
	amountPerInstallment: number
}
