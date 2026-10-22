# Income API

Base route: `/incomes`. An income is money received within one budget period.

## Resource

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `budgetPeriodId` | uuid | |
| `description` | string | |
| `amount` | number | |
| `isSalary` | boolean | |
| `receivedAt` | date \| null | |
| `createdAt` | date | |
| `updatedAt` | date | |
| `deletedAt` | date \| null | always `null` |

## Past-period rule

Incomes whose budget period is earlier than the current UTC year/month cannot be updated or deleted (`422`). Creation is allowed in any existing period.

## GET /incomes

| Query param | Type | Required | Notes |
|---|---|---|---|
| `budgetPeriodId` | uuid | no | Return only incomes of this period |

- **200** `Income[]`
- **400** `budgetPeriodId` is not a UUID
- **500**

## GET /incomes/:id

- **200** `Income`
- **400** `id` is not a UUID
- **404** income not found
- **500**

## POST /incomes

| Field | Type | Required | Rules |
|---|---|---|---|
| `budgetPeriodId` | uuid | yes | existing period |
| `description` | string | yes | non-empty |
| `amount` | number | yes | monetary amount |
| `isSalary` | boolean | no | default `false` |
| `receivedAt` | date \| null | no | |

```json
{
  "budgetPeriodId": "7c1f0d3e-5b0a-4b8e-9a52-1f6a2c4d8e90",
  "description": "March salary",
  "amount": 5200,
  "isSalary": true,
  "receivedAt": "2026-03-05"
}
```

- **201** `Income`
- **400** validation failure
- **404** budget period not found
- **500**

## PATCH /incomes/:id

| Field | Type | Rules |
|---|---|---|
| `description` | string | non-empty |
| `amount` | number | monetary amount |
| `isSalary` | boolean | |
| `receivedAt` | date \| null | `null` clears it |

At least one field is required. `budgetPeriodId` cannot be changed.

- **200** updated `Income`
- **400** `id` not a UUID, invalid body, or empty body
- **404** income not found
- **422** the income's period is in the past: `Cannot update an income from a past budget period`
- **500**

## DELETE /incomes/:id

- **204** no body
- **400** `id` is not a UUID
- **404** income not found
- **422** the income's period is in the past: `Cannot delete an income from a past budget period`
- **500**
