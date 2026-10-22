# Payment Type API

Base route: `/payment-types`. Lookup table describing how an expense was paid. Names are unique among active payment types (exact, case-sensitive match).

## Resource

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | |
| `hasStatement` | boolean | when `true`, expenses using this payment type must have a `bankId` |
| `createdAt` | date | |
| `updatedAt` | date | |
| `deletedAt` | date \| null | always `null` |

## GET /payment-types

- **200** `PaymentType[]` (no pagination)
- **500**

## GET /payment-types/:id

- **200** `PaymentType`
- **400** `id` is not a UUID
- **404** payment type not found
- **500**

## POST /payment-types

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | yes | non-empty, unique |
| `hasStatement` | boolean | yes | |

```json
{ "name": "Credit Card", "hasStatement": true }
```

- **201** `PaymentType`
- **400** validation failure
- **409** `A payment type named 'Credit Card' already exists`
- **500**

## PATCH /payment-types/:id

| Field | Type | Rules |
|---|---|---|
| `name` | string | non-empty, unique |
| `hasStatement` | boolean | |

At least one field is required. Changing `hasStatement` does not re-validate existing expenses.

- **200** updated `PaymentType`
- **400** `id` not a UUID, invalid body, or empty body
- **404** payment type not found
- **409** the new name is already used by another payment type
- **500**

## DELETE /payment-types/:id

Soft-deletes the payment type. The request is rejected with `409` while it is referenced by an active recurring expense (not cancelled before the current UTC month) or by an expense in the current or a future budget period. Expenses in past periods do not block deletion and keep their reference for historical display.

- **204** no body
- **400** `id` is not a UUID
- **404** payment type not found
- **409** payment type is still actively referenced and cannot be deleted
- **500**
