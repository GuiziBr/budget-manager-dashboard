# Expense API

Base route: `/expenses`. An expense is a single monetary outflow belonging to one budget period. It is created as one of three types — `one-time`, `recurring` or `installment` — but the stored resource has no `type` field; the type is implied by `installmentGroupId` / `recurringExpenseId`.

## Resource

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `budgetPeriodId` | uuid | |
| `recurringExpenseId` | uuid \| null | set for recurring expenses |
| `description` | string | |
| `installmentNumber` | integer \| null | 1-based, set for installment expenses |
| `purchasedAt` | date \| null | |
| `dueAt` | date \| null | |
| `paidAt` | date \| null | |
| `amount` | number | |
| `category` | object | read-only. `{ id, name }` of the category. Still returned when the category was soft-deleted afterwards |
| `paymentType` | object | read-only. `{ id, name }` of the payment type. Same behaviour as `category` |
| `bank` | object \| null | read-only. `{ id, name }`, or `null` when `bankId` is `null`. Still returned when the bank was soft-deleted |
| `store` | object \| null | read-only. `{ id, name }`, or `null` when `storeId` is `null`. Still returned when the store was soft-deleted |
| `installment` | object \| null | read-only. `null` for one-time and recurring expenses. See below |
| `monthsRunning` | integer \| null | read-only, ≥ 1. Set for recurring expenses, `null` otherwise. See below |
| `createdAt` | date | |
| `updatedAt` | date | |
| `deletedAt` | date \| null | always `null` |

`installment` (the plan the expense belongs to):

| Field | Type | Notes |
|---|---|---|
| `installment.id` | uuid | id of the installment group |
| `installment.totalInstallments` | integer | does not change when a payment is deleted |
| `installment.paymentIntervalDays` | integer | |
| `installment.firstPurchasedAt` | date | |

`monthsRunning` = the template's `monthsAlreadyPaid` + the calendar months from the template's `startedAt` up to and including the expense's month. It does not depend on how many rows were deleted. Example: a template started in January 2026 with `monthsAlreadyPaid: 0` gives `11` for its November 2026 expense; with `monthsAlreadyPaid: 10` it gives `21`.

Responses carry the lookup ids inside the nested objects (there are no flat `categoryId`, `paymentTypeId`, `bankId`, `storeId` or `installmentGroupId` fields); request bodies still use the flat `categoryId`, `paymentTypeId`, `bankId` and `storeId`. The read-only fields (`category`, `paymentType`, `bank`, `store`, `installment`, `monthsRunning`) are returned by `GET /expenses`, `GET /expenses/:id`, and the responses of `POST` and `PATCH /expenses`. They are resolved in the same query as the page, not one query per row.

## GET /expenses

Paginated, sortable list. Defaults to newest first (`createdAt` descending).

| Query param | Type | Default | Rules |
|---|---|---|---|
| `budgetPeriodId` | uuid | – | filter by period |
| `page` | integer | `1` | ≥ 1 |
| `limit` | integer | `20` | 1–100 |
| `sortBy` | string | `createdAt` | one of `description`, `amount`, `purchasedAt`, `dueAt`, `paidAt`, `installmentNumber`, `createdAt`, `updatedAt` |
| `sortOrder` | string | `desc` | `asc` or `desc` |

Nullable fields (`purchasedAt`, `dueAt`, `paidAt`, `installmentNumber`) sort nulls last in both directions. Ties are broken by `id`, so paging is stable.

- **200**
  ```json
  { "data": [ /* Expense[] */ ], "total": 42, "totalAmount": 1234.56, "page": 1, "limit": 20 }
  ```
  `total` is the number of matching expenses across all pages. `totalAmount` is the sum of `amount` over those same expenses (`0` when none match).
- **400** invalid `budgetPeriodId`, `page`, `limit`, `sortBy` or `sortOrder`
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

Same fields as `one-time`, plus:

| Field | Type | Required | Rules |
|---|---|---|---|
| `monthsAlreadyPaid` | integer | no | ≥ 0, default `0`. Months the bill was already paid before being registered here. Stored on the template |

Besides the expense, a recurring-expense template is created (see [recurring-expense.md](recurring-expense.md)) with `startedAt` = first day of the budget period's month, and the expense is linked to it via `recurringExpenseId`. Future periods opened via `POST /budget-periods` then receive a copy automatically.

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
