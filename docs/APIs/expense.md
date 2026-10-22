# Expense API

Base route: `/expenses`. An expense is a single monetary outflow belonging to one budget period. It is created as one of three types — `one-time`, `recurring` or `installment` — but the stored resource has no `type` field; the type is implied by `installmentGroupId` / `recurringExpenseId`.

## Resource

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `budgetPeriodId` | uuid | |
| `categoryId` | uuid | |
| `paymentTypeId` | uuid | |
| `bankId` | uuid \| null | |
| `storeId` | uuid \| null | |
| `installmentGroupId` | uuid \| null | set for installment expenses |
| `recurringExpenseId` | uuid \| null | set for recurring expenses |
| `description` | string | |
| `installmentNumber` | integer \| null | 1-based, set for installment expenses |
| `purchasedAt` | date \| null | |
| `dueAt` | date \| null | |
| `paidAt` | date \| null | |
| `amount` | number | |
| `createdAt` | date | |
| `updatedAt` | date | |
| `deletedAt` | date \| null | always `null` |

## GET /expenses

Paginated list, newest first (`createdAt` descending).

| Query param | Type | Default | Rules |
|---|---|---|---|
| `budgetPeriodId` | uuid | – | filter by period |
| `page` | integer | `1` | ≥ 1 |
| `limit` | integer | `20` | 1–100 |

- **200**
  ```json
  { "data": [ /* Expense[] */ ], "total": 42, "page": 1, "limit": 20 }
  ```
  `total` is the number of matching expenses across all pages.
- **400** invalid `budgetPeriodId`, `page` or `limit`
- **500**

## GET /expenses/:id

- **200** `Expense`
- **400** `id` is not a UUID
- **404** expense not found
- **500**

## POST /expenses

The body is a discriminated union on `type`. Fields shared by every type:

| Field | Type | Required | Rules |
|---|---|---|---|
| `type` | `"one-time"` \| `"recurring"` \| `"installment"` | yes | |
| `budgetPeriodId` | uuid | yes | existing period |
| `categoryId` | uuid | yes | existing category |
| `paymentTypeId` | uuid | yes | existing payment type |
| `bankId` | uuid \| null | no | **required** when the payment type has `hasStatement = true` |
| `storeId` | uuid \| null | no | |
| `description` | string | yes | non-empty |

When `bankId` or `storeId` is provided (non-null), the bank or store must exist and not be soft-deleted; otherwise the request fails with `404`.

### type `one-time`

| Field | Type | Required |
|---|---|---|
| `amount` | number | yes |
| `purchasedAt` | date | no |
| `dueAt` | date | no |
| `paidAt` | date | no |

Creates one expense in `budgetPeriodId`.

```json
{
  "type": "one-time",
  "budgetPeriodId": "7c1f0d3e-5b0a-4b8e-9a52-1f6a2c4d8e90",
  "categoryId": "2a9d6e11-0c3b-4f57-8d1e-6b7f3a9c5e22",
  "paymentTypeId": "e4b8c0aa-93d1-4d0f-b0a7-5c1d2e3f4a56",
  "bankId": "a1b2c3d4-0000-4000-8000-1234567890ab",
  "description": "Groceries",
  "amount": 54.9,
  "purchasedAt": "2026-03-04"
}
```

### type `recurring`

Same fields as `one-time`. Besides the expense, a recurring-expense template is created (see [recurring-expense.md](recurring-expense.md)) with `startedAt` = first day of the budget period's month, and the expense is linked to it via `recurringExpenseId`. Future periods opened via `POST /budget-periods` then receive a copy automatically.

### type `installment`

| Field | Type | Required | Rules |
|---|---|---|---|
| `amountPerInstallment` | number | yes | monetary amount |
| `totalInstallments` | integer | yes | ≥ 2 |
| `paymentIntervalDays` | integer | yes | ≥ 1 |
| `firstPurchasedAt` | date | yes | |

`budgetPeriodId` is validated as an existing period but is **not** used to place the installments. Instead an `InstallmentGroup` is created (see [installment-group.md](installment-group.md)) and installment *i* (1-based) is generated with:

- `dueAt` = `firstPurchasedAt` + (*i* − 1) × `paymentIntervalDays` days (UTC)
- `budgetPeriodId` = the existing period matching `dueAt`'s year/month
- `amount` = `amountPerInstallment`
- `purchasedAt` = `firstPurchasedAt` for installment 1, otherwise `null`

Installments whose due date has no existing budget period are skipped for now; they are created when that period is opened. The response is installment number 1 when it was created, otherwise the first created installment.

### Responses

- **201** the created `Expense` (see above for which one is returned for installments)
- **400** validation failure; `bankId is required for this payment type`; or (installment) `No matching budget periods found for any installment due date`
- **404** budget period, category, payment type, bank or store not found
- **500**

## PATCH /expenses/:id

Updates one expense only (including installment expenses; use [installment groups](installment-group.md) to change all of them).

| Field | Type | Rules |
|---|---|---|
| `description` | string | non-empty |
| `amount` | number | monetary amount |
| `categoryId` | uuid | existing category |
| `paymentTypeId` | uuid | existing payment type |
| `bankId` | uuid \| null | `null` clears it |
| `storeId` | uuid \| null | `null` clears it |
| `purchasedAt` | date \| null | `null` clears it |
| `dueAt` | date \| null | `null` clears it |
| `paidAt` | date \| null | `null` clears it (marks unpaid) |

At least one field is required. `budgetPeriodId` and `type` cannot be changed. If `paymentTypeId` changes or `bankId` is cleared, and the resulting payment type has `hasStatement = true`, a bank must remain set.

- **200** updated `Expense`
- **400** validation failure, empty body, or `bankId is required for this payment type`
- **404** expense, category, payment type, bank or store not found (`bankId` / `storeId` are only checked when non-null)
- **500**

## DELETE /expenses/:id

Soft-deletes one expense. For installment expenses the group and the other installments are left untouched.

- **204** no body
- **400** `id` is not a UUID
- **404** expense not found
- **500**
