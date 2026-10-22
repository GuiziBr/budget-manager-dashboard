# Bank API

Base route: `/banks`. Lookup table of banks/card issuers that expenses can reference. Names are unique among active banks (exact, case-sensitive match).

## Resource

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | |
| `createdAt` | date | |
| `updatedAt` | date | |
| `deletedAt` | date \| null | always `null` |

## GET /banks

- **200** `Bank[]` (no pagination)
- **500**

## GET /banks/:id

- **200** `Bank`
- **400** `id` is not a UUID
- **404** bank not found
- **500**

## POST /banks

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | yes | non-empty, unique |

```json
{ "name": "Nubank" }
```

- **201** `Bank`
- **400** validation failure
- **409** `A bank named 'Nubank' already exists`
- **500**

## PATCH /banks/:id

| Field | Type | Rules |
|---|---|---|
| `name` | string | non-empty, unique |

At least one field is required.

- **200** updated `Bank`
- **400** `id` not a UUID, invalid body, or empty body
- **404** bank not found
- **409** the new name is already used by another bank
- **500**

## DELETE /banks/:id

Soft-deletes the bank. The request is rejected with `409` while it is referenced by an active recurring expense (not cancelled before the current UTC month) or by an expense in the current or a future budget period. Expenses in past periods do not block deletion and keep their reference for historical display.

- **204** no body
- **400** `id` is not a UUID
- **404** bank not found
- **409** bank is still actively referenced and cannot be deleted
- **500**
