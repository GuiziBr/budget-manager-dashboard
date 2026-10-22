# Category API

Base route: `/categories`. Lookup table classifying expenses. Names are unique among active categories (the check is by exact value, so it is case-sensitive).

## Resource

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | |
| `hasBudgetEnvelope` | boolean | when `true`, new budget periods get an envelope for this category and envelopes may be created for it |
| `createdAt` | date | |
| `updatedAt` | date | |
| `deletedAt` | date \| null | always `null` |

## GET /categories

- **200** `Category[]` (no pagination)
- **500**

## GET /categories/:id

- **200** `Category`
- **400** `id` is not a UUID
- **404** category not found
- **500**

## POST /categories

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | yes | non-empty, unique |
| `hasBudgetEnvelope` | boolean | yes | |

```json
{ "name": "Grocery", "hasBudgetEnvelope": true }
```

- **201** `Category`
- **400** validation failure
- **409** `A category named 'Grocery' already exists`
- **500**

## PATCH /categories/:id

| Field | Type | Rules |
|---|---|---|
| `name` | string | non-empty, unique |
| `hasBudgetEnvelope` | boolean | |

At least one field is required.

- **200** updated `Category`
- **400** `id` not a UUID, invalid body, or empty body
- **404** category not found
- **409** the new name is already used by another category
- **500**

## DELETE /categories/:id

Soft-deletes the category. The request is rejected with `409` while it is referenced by an active recurring expense (not cancelled before the current UTC month) or by an expense or a budget envelope in the current or a future budget period. Past-period expenses and envelopes do not block deletion and keep their reference for historical display.

- **204** no body
- **400** `id` is not a UUID
- **404** category not found
- **409** category is still actively referenced (recurring expense, expense or budget envelope) and cannot be deleted
- **500**
