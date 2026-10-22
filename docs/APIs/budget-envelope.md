# Budget Envelope API

Base route: `/budget-envelopes`. A budget envelope allocates an amount of money to one category within one budget period. At most one active envelope may exist per (period, category).

## Resource

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `budgetPeriodId` | uuid | |
| `categoryId` | uuid | |
| `allocatedAmount` | number | monetary amount |
| `createdAt` | date | |
| `updatedAt` | date | |
| `deletedAt` | date \| null | always `null` |

The envelope holds only the allocation. It does not contain actual spend.

## Past-period rule

A period is "past" when its year/month is earlier than the current UTC year/month. Envelopes of past periods cannot be created, updated or deleted (`422`).

## GET /budget-envelopes

| Query param | Type | Required | Notes |
|---|---|---|---|
| `budgetPeriodId` | uuid | no | Return only envelopes of this period |

- **200** `BudgetEnvelope[]`
- **400** `budgetPeriodId` is not a UUID
- **500**

## GET /budget-envelopes/:id

- **200** `BudgetEnvelope`
- **400** `id` is not a UUID
- **404** envelope not found
- **500**

## POST /budget-envelopes

### Request body

| Field | Type | Required | Rules |
|---|---|---|---|
| `budgetPeriodId` | uuid | yes | must reference an existing period |
| `categoryId` | uuid | yes | must reference an existing category with `hasBudgetEnvelope = true` |
| `allocatedAmount` | number | yes | monetary amount |

```json
{
  "budgetPeriodId": "7c1f0d3e-5b0a-4b8e-9a52-1f6a2c4d8e90",
  "categoryId": "2a9d6e11-0c3b-4f57-8d1e-6b7f3a9c5e22",
  "allocatedAmount": 300
}
```

### Responses

- **201** `BudgetEnvelope`
- **400** validation failure, or the category does not support envelopes: `Category 'Rent' does not support budget envelopes`
- **404** budget period or category not found
- **409** an envelope for this category already exists in the period: `A budget envelope for this category already exists in the period`
- **422** the period is in the past: `Cannot create a budget envelope for a past budget period`
- **500**

## PATCH /budget-envelopes/:id

Only the allocation can change.

| Field | Type | Required | Rules |
|---|---|---|---|
| `allocatedAmount` | number | at least one field | monetary amount |

- **200** updated `BudgetEnvelope`
- **400** `id` not a UUID, invalid body, or empty body
- **404** envelope (or its period) not found
- **422** the envelope's period is in the past: `Cannot update a budget envelope from a past budget period`
- **500**

## DELETE /budget-envelopes/:id

- **204** no body
- **400** `id` is not a UUID
- **404** envelope not found
- **422** the envelope's period is in the past: `Cannot delete a budget envelope from a past budget period`
- **500**
