import type { Id, IsoDate } from "./common"

export interface Income {
	id: Id
	budgetPeriodId: Id
	description: string
	amount: number
	isSalary: boolean
	receivedAt: IsoDate | null
	createdAt: IsoDate
	updatedAt: IsoDate
	deletedAt: null
}

export interface CreateIncomeInput {
	budgetPeriodId: Id
	description: string
	amount: number
	isSalary?: boolean
	receivedAt?: IsoDate | null
}

export interface UpdateIncomeInput {
	description?: string
	amount?: number
	isSalary?: boolean
	receivedAt?: IsoDate | null
}
