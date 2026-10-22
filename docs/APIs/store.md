# Store API

Base route: `/stores`. Lookup table of merchants that expenses can reference. Names are unique among active stores (exact, case-sensitive match).

## Resource

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | |
| `createdAt` | date | |
| `updatedAt` | date | |
| `deletedAt` | date \| null | always `null` |

## GET /stores

- **200** `Store[]` (no pagination)
- **500**

## GET /stores/:id

- **200** `Store`
- **400** `id` is not a UUID
- **404** store not found
- **500**

## POST /stores

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | yes | non-empty, unique |

```json
{ "name": "Supermarket" }
```

- **201** `Store`
- **400** validation failure
- **409** `A store named 'Supermarket' already exists`
- **500**

## PATCH /stores/:id

| Field | Type | Rules |
|---|---|---|
| `name` | string | non-empty, unique |

At least one field is required.

- **200** updated `Store`
- **400** `id` not a UUID, invalid body, or empty body
- **404** store not found
- **409** the new name is already used by another store
- **500**

## DELETE /stores/:id

Soft-deletes the store. The request is rejected with `409` while it is referenced by an active recurring expense (not cancelled before the current UTC month) or by an expense in the current or a future budget period. Expenses in past periods do not block deletion and keep their reference for historical display.

- **204** no body
- **400** `id` is not a UUID
- **404** store not found
- **409** store is still actively referenced and cannot be deleted
- **500**
