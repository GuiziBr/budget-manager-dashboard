"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError, api } from "@/lib/api"
import { isUuid } from "@/lib/id"
import type { Id, InstallmentGroup, UpdateInstallmentGroupInput } from "@/types"

export const INSTALLMENT_GROUPS_QUERY_KEY = ["installment-groups"] as const

/**
 * Root key of every expense query. Kept local because the expense hooks live in
 * their own module; keep it equal to `EXPENSES_QUERY_KEY` there.
 */
const EXPENSES_QUERY_KEY = ["expenses"] as const

/**
 * The endpoint of one plan. An id that isn't a UUID (a tampered `?plan=` such as
 * `../budget-periods`) never reaches the URL: it fails like the API's own 400.
 */
function planEndpoint(id: Id): string {
	if (!isUuid(id)) throw new ApiError("Invalid id", 400)
	return `installment-groups/${encodeURIComponent(id)}`
}

export function installmentGroupQueryKey(id: Id | undefined) {
	return [...INSTALLMENT_GROUPS_QUERY_KEY, id] as const
}

/**
 * One installment plan, for the amount per payment, which `expense.installment`
 * doesn't carry. Pass `undefined` until the plan is needed to skip the request.
 */
export function useInstallmentGroup(id: Id | undefined) {
	return useQuery({
		queryKey: installmentGroupQueryKey(id),
		queryFn: async () => api.get<InstallmentGroup>(planEndpoint(id as Id)),
		enabled: id !== undefined,
		// A link to a plan that isn't there answers 404 or 400 for good: report it at once
		retry: false
	})
}

/**
 * Changes the amount per payment. The backend rewrites the amount of every
 * payment from the current month on, so every expense query is refreshed
 * (all months and pages), not just the visible one.
 */
export function useUpdateInstallmentGroup() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			...input
		}: UpdateInstallmentGroupInput & { id: Id }) =>
			api.patch<InstallmentGroup>(planEndpoint(id), input),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({
					queryKey: INSTALLMENT_GROUPS_QUERY_KEY
				}),
				queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY })
			])
	})
}
