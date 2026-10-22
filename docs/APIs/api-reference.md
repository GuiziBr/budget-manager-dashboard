# API Reference

One document per API (controller). All routes are served from the app root with no global prefix; the port comes from the `PORT` env var (default `3000`). No authentication is implemented.

| Document | Base route | Operations |
|---|---|---|
| [budget-period.md](budget-period.md) | `/budget-periods` | list, get, open, delete |
| [budget-envelope.md](budget-envelope.md) | `/budget-envelopes` | list, get, create, update, delete |
| [expense.md](expense.md) | `/expenses` | paginated list, get, create (3 types), update, delete |
| [installment-group.md](installment-group.md) | `/installment-groups` | get, update |
| [recurring-expense.md](recurring-expense.md) | `/recurring-expenses` | list, get, update, delete |
| [income.md](income.md) | `/incomes` | list, get, create, update, delete |
| [category.md](category.md) | `/categories` | list, get, create, update, delete |
| [payment-type.md](payment-type.md) | `/payment-types` | list, get, create, update, delete |
| [bank.md](bank.md) | `/banks` | list, get, create, update, delete |
| [store.md](store.md) | `/stores` | list, get, create, update, delete |

## Conventions shared by every endpoint

### Data types

| Type | Wire format |
|---|---|
| `uuid` | UUID string. Every `:id` path param and `*Id` field is validated with `z.uuid()`. |
| `date` / `createdAt` etc. | ISO 8601 string in responses (e.g. `2026-03-01T00:00:00.000Z`). Request date fields use `z.coerce.date()`, so any string `new Date()` accepts (`2026-03-01`, full ISO) is allowed. |
| `amount` | JSON number. Must be `> 0`, `<= 99999999.99`, with at most 2 decimal places. |

### Soft delete

`DELETE` sets `deletedAt` and returns `204 No Content` with an empty body. Soft-deleted rows never appear in any response. `deletedAt` is always `null` in responses.

### Request validation

Bodies, path params and query params are validated with Zod. A failure returns `400` before the service layer runs. `PATCH` bodies must contain at least one field (an empty `{}` returns `400` with the message `At least one field must be provided`).

### Error responses

| Status | Body |
|---|---|
| `400` validation | `{ "message": [ <Zod issue>, ... ], "error": "Bad Request", "statusCode": 400 }` |
| `400` business rule | `{ "message": "<text>", "error": "Bad Request", "statusCode": 400 }` |
| `404` | `{ "message": "<Entity> with id <id> not found", "error": "Not Found", "statusCode": 404 }` |
| `409` | `{ "message": "<text>", "error": "Conflict", "statusCode": 409 }` |
| `422` | `{ "message": "<text>", "error": "Unprocessable Entity", "statusCode": 422 }` |
| `500` | `{ "message": "Internal Server Error", "statusCode": 500 }` |

A Zod issue looks like `{ "code": "invalid_type", "path": ["name"], "message": "Invalid input: expected string, received undefined" }`. The details are logged server-side, never returned on `500`.

Each endpoint document lists only the status codes that endpoint can produce.
