# Budget Envelope API

Base route: `/budget-envelopes`. A budget envelope allocates an amount of money to one category within one budget period. At most one active envelope may exist per (period, category).

## Resource

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `budgetPeriodId` | uuid | |
| `categoryId` | uuid | |
| `allocatedAmount` | number | monetary amount |
| `spentAmount` | number \| null | read-only. Actual spend in the envelope's category during the period, never negative. `null` when it could not be determined. Only returned by `GET`/`POST` (see [Envelope spend](#envelope-spend)) |
| `spendUpdatedAt` | date \| null | read-only. When the spend figure was fetched from the external spend API. `null` when `spentAmount` is `null`. Only returned by `GET`/`POST` |
| `createdAt` | date | |
| `updatedAt` | date | |
| `deletedAt` | date \| null | always `null` |

## Envelope spend

Spend is not stored. It is fetched at query time from the external expense server (`GET /balance/envelopes/:year/:month`) using the month of the envelope's budget period, and matched to the envelope by category id. The external API applies the billing-cycle rule, so this server only sends the month.

- `spentAmount` is converted from cents to currency units. A category missing from the response gives `0`. Future periods are computed like any other.
- The external API is called **once per distinct period** in a response. A request filtered by `budgetPeriodId` makes one call whatever the number of envelopes.
- **Caching** (in memory, per period): past periods are cached for good, since their figure is final. Current and future periods are cached for 60 seconds. `spendUpdatedAt` tells how fresh the figure is. Failures are never cached.
- **Failure:** if the call fails or times out (3 seconds), the response is still `200` with `spentAmount: null` and `spendUpdatedAt: null` for the envelopes of that period, and `allocatedAmount` unchanged. The error is logged server-side.
- `PATCH` and `DELETE` do not call the external API. `PATCH` returns the envelope without the two spend fields.
- The two fields are never accepted in a request body: bodies with unknown fields return `400`.

Configuration: `EXPENSE_API_URL`, `EXPENSE_API_KEY` (sent as `x-api-key`) and `EXPENSE_API_USER_ID` (the user whose expenses are summed).

## Past-period rule

A period is "past" when its year/month is earlier than the current UTC year/month. Envelopes of past periods cannot be created, updated or deleted (`422`).

## GET /budget-envelopes

| Query param | Type | Required | Notes |
|---|---|---|---|
| `budgetPeriodId` | uuid | no | Return only envelopes of this period |

- **200** `BudgetEnvelope[]`, each with `spentAmount` and `spendUpdatedAt`
- **400** `budgetPeriodId` is not a UUID
- **500**

## GET /budget-envelopes/:id

- **200** `BudgetEnvelope` with `spentAmount` and `spendUpdatedAt`
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

Response body:

```json
{
  "id": "…",
  "budgetPeriodId": "7c1f0d3e-5b0a-4b8e-9a52-1f6a2c4d8e90",
  "categoryId": "2a9d6e11-0c3b-4f57-8d1e-6b7f3a9c5e22",
  "allocatedAmount": 300,
  "spentAmount": 245.18,
  "spendUpdatedAt": "2026-11-02T14:03:11.000Z",
  "createdAt": "2026-11-01T00:00:00.000Z",
  "updatedAt": "2026-11-01T00:00:00.000Z",
  "deletedAt": null
}
```

### Responses

- **201** `BudgetEnvelope` with `spentAmount` and `spendUpdatedAt`
- **400** validation failure (including unknown fields), or the category does not support envelopes: `Category 'Rent' does not support budget envelopes`
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
