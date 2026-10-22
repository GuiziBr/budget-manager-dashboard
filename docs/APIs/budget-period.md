# Budget Period API

Base route: `/budget-periods`. A budget period is one calendar month; it is the container for expenses, incomes and budget envelopes. Periods are immutable once created (no `PATCH`).

## Resource

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `year` | integer | |
| `month` | integer | 1–12 |
| `createdAt` | date | |
| `updatedAt` | date | |
| `deletedAt` | date \| null | always `null` |

## GET /budget-periods

List all budget periods. No filtering, pagination or guaranteed ordering.

- **200** `BudgetPeriod[]`
- **500** unexpected failure

## GET /budget-periods/:id

- **200** `BudgetPeriod`
- **400** `id` is not a UUID
- **404** period not found
- **500**

## POST /budget-periods

Opens a new period. In a single transaction the API also generates the period's content:

1. **Installment expenses** — for every installment group, any installment whose due date falls in this month and that does not yet exist is created (`dueAt` = computed due date, `purchasedAt` = `null`). Category, payment type, bank and store are copied from the group's first expense.
2. **Recurring expenses** — one expense per recurring template that is active for the month (`startedAt <= first day of month` and not cancelled before it).
3. **Budget envelopes** — one per category with `hasBudgetEnvelope = true`, with `allocatedAmount` from a built-in default table (Baby 200, Fuel 80, Grocery 300, Shopping 50, Restaurant 200, Parking 20, Pharmacy 10; any other category gets `0`).

### Request body

| Field | Type | Required | Rules |
|---|---|---|---|
| `year` | integer | yes | `2000` ≤ year ≤ current UTC year + 1 (evaluated on every request) |
| `month` | integer | yes | 1–12 |

```json
{ "year": 2026, "month": 3 }
```

### Responses

- **201** `BudgetPeriod`
  ```json
  {
    "id": "7c1f0d3e-5b0a-4b8e-9a52-1f6a2c4d8e90",
    "year": 2026,
    "month": 3,
    "createdAt": "2026-03-01T10:00:00.000Z",
    "updatedAt": "2026-03-01T10:00:00.000Z",
    "deletedAt": null
  }
  ```
- **400** validation failure (missing field, non-integer, out-of-range year/month)
- **409** a period for that year/month already exists: `A budget period for 2026/03 already exists`
- **500**

The generated expenses and envelopes are not in the response; fetch them via [`GET /expenses?budgetPeriodId=`](expense.md) and [`GET /budget-envelopes?budgetPeriodId=`](budget-envelope.md).

## DELETE /budget-periods/:id

Soft-deletes the period.

- **204** no body
- **400** `id` is not a UUID
- **404** period not found
- **409** the period still has active expenses, incomes or budget envelopes: `Cannot delete a budget period that has linked expenses, incomes, or budget envelopes`. Delete those first.
- **500**
