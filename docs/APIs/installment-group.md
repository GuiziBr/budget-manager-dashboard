# Installment Group API

Base route: `/installment-groups`. An installment group is the parent record of an installment purchase. Groups are created indirectly via `POST /expenses` with `type: "installment"` ([expense.md](expense.md)); there is no create, list or delete endpoint.

## Resource

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `description` | string | |
| `amountPerInstallment` | number | |
| `totalInstallments` | integer | |
| `paymentIntervalDays` | integer | days between installments |
| `firstPurchasedAt` | date | |
| `createdAt` | date | |
| `updatedAt` | date | |
| `deletedAt` | date \| null | always `null` |

## GET /installment-groups/:id

- **200** `InstallmentGroup`
- **400** `id` is not a UUID
- **404** group not found: `InstallmentGroup with id <id> not found`
- **500**

## PATCH /installment-groups/:id

| Field | Type | Rules |
|---|---|---|
| `amountPerInstallment` | number | monetary amount |

At least one field is required. `totalInstallments` is read-only: it is set when the installment purchase is created, and sending it (or any other unknown field) returns `400`.

Side effects, applied in one transaction:

- When `amountPerInstallment` is sent, `amount` is updated on every installment expense of the group whose budget period is the **current UTC month or later**. Expenses in past periods keep their original amount.

```json
{ "amountPerInstallment": 120.5 }
```

- **200** updated `InstallmentGroup`
- **400** `id` not a UUID, invalid body, empty body, or unknown field such as `totalInstallments`
- **404** group not found
- **500**
