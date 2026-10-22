# Recurring Expense API

Base route: `/recurring-expenses`. A recurring expense is a template that is copied as an expense into every budget period opened while it is active. Templates are created indirectly via `POST /expenses` with `type: "recurring"` ([expense.md](expense.md)); there is no create endpoint here.

## Resource

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `categoryId` | uuid | |
| `paymentTypeId` | uuid | |
| `bankId` | uuid \| null | |
| `storeId` | uuid \| null | |
| `description` | string | |
| `amount` | number | |
| `startedAt` | date | first day (UTC) of the month of the `budgetPeriodId` selected in the `POST /expenses` request that created it |
| `cancelledAt` | date \| null | `null` while active |
| `createdAt` | date | |
| `updatedAt` | date | |
| `deletedAt` | date \| null | always `null` |

A template is copied into a new period when `startedAt` ≤ first day of that month and `cancelledAt` is `null` or ≥ first day of that month.

## GET /recurring-expenses

List all templates (active, cancelled and future). No filtering or pagination.

- **200** `RecurringExpense[]`
- **500**

## GET /recurring-expenses/:id

- **200** `RecurringExpense`
- **400** `id` is not a UUID
- **404** template not found
- **500**

## PATCH /recurring-expenses/:id

| Field | Type | Rules |
|---|---|---|
| `description` | string | non-empty |
| `amount` | number | monetary amount |
| `cancelledAt` | date | must be ≥ first day of the current UTC month |

At least one field is required. Changes affect only periods opened afterwards; expenses already generated are not modified. `cancelledAt` cannot be set back to `null` through this endpoint.

Example (the date is a placeholder: it must be on or after the first day of the current UTC month, so update it to a current or future date, otherwise the request returns `400`):

```json
{ "cancelledAt": "2026-12-01" }
```

- **200** updated `RecurringExpense`
- **400** `id` not a UUID, invalid body, empty body, or `cancelledAt must be on or after the first day of the current month`
- **404** template not found
- **500**

## DELETE /recurring-expenses/:id

Soft-deletes the template and sets `cancelledAt` to now. Previously generated expenses are kept.

- **204** no body
- **400** `id` is not a UUID
- **404** template not found
- **500**
