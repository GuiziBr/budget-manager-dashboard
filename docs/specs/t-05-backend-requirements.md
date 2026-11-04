# T-05 — Backend Requirements

Status: delivered 2026-11-03 · Last updated: 2026-11-03

What the backend needs to provide so the Month screen's row model, totals and envelope status (task **T-05**, see [the plan](../plans/t-05-month-rows.md)) can show real data instead of placeholders.

**Nothing here blocks T-05.** The frontend ships with placeholders and plugs the real values in later. Only **BE-A (envelope spend)** is needed for the feature to be complete; BE-B to BE-D remove the extra requests and placeholders the frontend uses meanwhile.

Related: [Month spec](month-screen.md) §2, §6 · [Backlog](todo.md) (G-5, G-2, G-3, G-6) · [Budget envelope API](../APIs/budget-envelope.md) · [Expense API](../APIs/expense.md) · [Installment group API](../APIs/installment-group.md)

---

## Outcome (2026-11-03)

The backend delivered BE-A to BE-D. The API docs are the source of truth now: [budget-envelope.md](../APIs/budget-envelope.md), [expense.md](../APIs/expense.md), [recurring-expense.md](../APIs/recurring-expense.md). Below is what differs from this document's proposal.

| Item | As delivered |
|---|---|
| BE-A envelope spend | `spentAmount` and `spendUpdatedAt` on `GET` and `POST`. `PATCH` returns neither. One external call per period; the external API applies the billing-cycle rule (Q-6, Q-7 answered: nothing to store on payment types). Cache: past periods for good, current and future 60 s. Failure: 200 with `null` for the envelopes of that period. A category missing from the response gives `0` |
| BE-B plan size | Nested `installment` object, with an added `installment.id`. The amount per payment is not included (read it from the group) |
| BE-C lookup names | Nested `category`, `paymentType`, `bank`, `store` objects `{ id, name }`. The flat id fields are **removed** from responses, which is a breaking change for readers of `GET /expenses` |
| BE-D months running | `monthsRunning` on expenses; `monthsAlreadyPaid` on the recurring template (accepted by `POST /expenses` recurring and by `PATCH /recurring-expenses/:id`) |

Still open: envelopes carry only `categoryId` (backlog G-12), and **Q-3** (does the external spend already include expenses recorded in envelope categories?), which decides whether Total expenses can count the same money twice.

---

## 1. Summary

| ID | Change | Backlog | Priority | Needed by T-05? |
|---|---|---|---|---|
| BE-A | Return the actual **spend** with each budget envelope | G-5 | Must | Yes (placeholder until then) |
| BE-B | Return the plan size with installment expenses | G-2 | Should | No (saves one request per plan) |
| BE-C | Return lookup names with expenses | G-3 | Should | No (replaces "(deleted)") |
| BE-D | Return the months-running count with recurring expenses | G-6 | Should | No (replaces "Month —") |

Already in place and used as is: `totalAmount` on `GET /expenses` (the month's expense total across all pages, `0` when none).

---

## 2. BE-A — Envelope spend (G-5, must)

### Why

Total expenses on the Month screen are the sum of **all expense amounts plus the amount spent in each envelope** (spec §2). Balance is income minus that. Today `GET /budget-envelopes` returns only `allocatedAmount`, so spend counts as 0, the Expenses card says "Envelope spend not included yet", and the Envelopes card shows "—".

Spend is **not stored**. The software specification says it is fetched at query time from an external spend API (for example `GET /balances?category=Groceries&month=2026-03`). The backend is the right place to call it: the frontend must not know about the external API.

### Required change

Add two read-only fields to the `BudgetEnvelope` resource:

| Field | Type | Notes |
|---|---|---|
| `spentAmount` | number \| null | Actual spend in the envelope's category during the envelope's period. `null` when it can't be determined (see failures below). Never negative |
| `spendUpdatedAt` | date \| null | When the figure was fetched from the external API. `null` when `spentAmount` is `null` |

They are returned by:

- `GET /budget-envelopes` (the Month screen's call, filtered by `budgetPeriodId`)
- `GET /budget-envelopes/:id` (the envelope details panel)
- `POST /budget-envelopes` (the response of a new envelope)

`PATCH` and `DELETE` are unchanged. The fields are never accepted in a request body (a body that includes them returns `400`, like any unknown field).

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

### Rules

1. **Period.** A purchase is attributed to a budget period by the **billing cycle of its payment type**, not by the calendar day it was made. For a credit card, a purchase made after the card's due date belongs to the next cycle, so it counts in the next month's envelope. `spentAmount` is the total attributed to the envelope's period under that rule. Which side applies the rule (the external spend API or this backend) is open: see Q-6.
2. **Category.** One figure per envelope, for that envelope's category. The mapping from the category to the external API's key (today its name) lives in the backend.
3. **Future periods can have spend.** Because of the billing-cycle rule, spend made this month after a card's due date already belongs to next month (and, for installment-like or delayed statements, possibly later ones). The backend must compute spend for future periods like any other and must not return `0` by default.
4. **Past periods** return the final figure, since their cycles are over. The backend may cache it for good.
5. **Current and future periods** may still change, so cache briefly (suggested: 5 minutes) so opening the screen doesn't call the external API every time. `spendUpdatedAt` tells the frontend how fresh it is.
6. **Amounts** follow the API's conventions: JSON number, 2 decimals, CAD. A refund-heavy month can't produce a negative figure: clamp at `0`.
7. **One external call per request.** The external API returns the amount for all categories at once, so the backend makes a single call for the period and maps the result onto the envelopes, with a timeout (suggested: 3 seconds). No per-envelope calls and no parallelism needed. A category missing from the response means nothing was spent: `spentAmount: 0`.

### When the external API fails

The envelope list must **still return `200`**. A failed or timed-out external call returns `spentAmount: null` and `spendUpdatedAt: null` for **every** envelope of the response (it is one call, so it succeeds or fails as a whole), and is logged server-side. The frontend shows "—" for it, counts it as 0 in the totals, and keeps the "Envelope spend not included yet" note.

Returning a `5xx` for the whole list would take the Envelopes card down because of an outside dependency, so it is not acceptable.

### Acceptance criteria

- *Given* a Groceries envelope in November 2026 and the external API reporting 245.18 for it, *when* I call `GET /budget-envelopes?budgetPeriodId=…`, *then* the envelope has `spentAmount: 245.18` and a `spendUpdatedAt`.
- *Given* the external API is down, *then* the response is `200`, every `spentAmount` is `null`, and `allocatedAmount` is unchanged.
- *Given* the external response has no entry for the Parking category, *then* the Parking envelope has `spentAmount: 0`.
- *Given* an envelope list request, *then* the external API is called once, whatever the number of envelopes.
- *Given* a Groceries purchase of 80.00 made on 20 November 2026 on a credit card whose due date is the 15th, *then* it counts in the December 2026 envelope's `spentAmount` and not in November's.
- *Given* a future period with no attributed purchases, *then* `spentAmount` is `0`.
- *Given* an envelope in a past period, *then* `spentAmount` is the month's final figure.
- *Given* `POST /budget-envelopes`, *then* the `201` body includes the two new fields.

### Documentation to update

`docs/APIs/budget-envelope.md`: the resource table and its sentence "The envelope holds only the allocation. It does not contain actual spend." (replace it), the three responses above, and the failure behaviour.

---

## 3. BE-B — Plan size on installment expenses (G-2, should)

### Why

The `#` column shows `n of N`, and the details panel shows the end date. `GET /expenses` returns only `installmentGroupId` and `installmentNumber`, so the frontend makes one `GET /installment-groups/:id` per plan in the month (up to 20 per page) to learn `N`, the interval and the first purchase date.

### Required change

For expenses with an `installmentGroupId`, return the plan's figures inside the expense:

| Field | Type | Notes |
|---|---|---|
| `installment` | object \| null | `null` for one-time and recurring expenses |
| `installment.totalInstallments` | integer | Doesn't change when a payment is deleted |
| `installment.paymentIntervalDays` | integer | |
| `installment.firstPurchasedAt` | date | |

(Alternatively, three flat fields on the expense: `totalInstallments`, `paymentIntervalDays`, `firstPurchasedAt`. Either works; the frontend adapts. A nested object is suggested because it keeps the plan's fields together and is clearly `null` for other types.)

Applies to `GET /expenses`, `GET /expenses/:id`, and the responses of `POST` and `PATCH /expenses`. Resolve the plans with a single query for the whole page, not one per row.

### Acceptance criteria

- *Given* installment 3 of a 12-payment plan, *then* the expense carries `installment.totalInstallments: 12`.
- *Given* a one-time expense, *then* `installment` is `null`.
- *Given* a page of 20 expenses from 20 different plans, *then* the plans are loaded with one query.

### Documentation to update

`docs/APIs/expense.md` resource table and the `GET /expenses` section.

---

## 4. BE-C — Lookup names on expenses (G-3, should)

### Why

Category, payment type, bank and store lists don't return deleted records, but expenses keep pointing at them. The frontend can't name the lookup of an old expense and shows "(deleted)".

### Required change

Return the names with each expense, including when the lookup is soft-deleted:

| Field | Type | Notes |
|---|---|---|
| `categoryName` | string | |
| `paymentTypeName` | string | |
| `bankName` | string \| null | `null` when `bankId` is `null` |
| `storeName` | string \| null | `null` when `storeId` is `null` |

Applies to the same four expense responses as BE-B. The names are read-only. The lookup endpoints themselves don't change: the forms still offer only active records.

(Alternative: let the lookup list endpoints accept `includeDeleted=true`. Names on the expense are preferred: no extra request and no change to the lookups.)

### Acceptance criteria

- *Given* an expense whose bank was deleted afterwards, *then* the expense still returns `bankName` with the bank's old name.
- *Given* an expense with no bank, *then* `bankName` is `null`.

### Documentation to update

`docs/APIs/expense.md` resource table.

---

## 5. BE-D — Months running on recurring expenses (G-6, should)

### Why

Recurring rows should show "Month 11" instead of "Month —" (M-10). There is no source for the count.

### Required change

1. Add a starting count to the recurring-expense template (`monthsAlreadyPaid`, integer ≥ 0, default `0`), accepted on create (`POST /expenses` with `type: "recurring"`) and on `PATCH /recurring-expenses/:id`. It is used by the Recurring screen's "Months already paid" field (R-04).
2. Return `monthsRunning` (integer ≥ 1) on expenses that have a `recurringExpenseId`, `null` otherwise. Definition: `monthsAlreadyPaid` plus the number of months from the template's `startedAt` up to and including the expense's month. The count is by calendar month and does not depend on how many rows were deleted.

Applies to the same four expense responses as BE-B.

### Acceptance criteria

- *Given* a bill started in January 2026 with `monthsAlreadyPaid: 0`, *then* its November 2026 row has `monthsRunning: 11`.
- *Given* `monthsAlreadyPaid: 10` and a start in January 2026, *then* the November row has `monthsRunning: 21`.
- *Given* a one-time expense, *then* `monthsRunning` is `null`.

### Documentation to update

`docs/APIs/recurring-expense.md` and `docs/APIs/expense.md`.

---

## 6. Compatibility and rollout

- All changes are **additive**: new response fields, no field removed or renamed, no request that worked before stops working.
- The frontend types mark every new field as optional until the backend ships it, and falls back to today's behaviour when a field is absent. Each can be released independently, in any order.
- Suggested order: **BE-A** first (completes T-05's totals and the Envelopes card), then BE-B (fewest requests), then BE-C and BE-D.

## 7. Questions for the backend

| ID | Question | Why it matters |
|---|---|---|
| Q-1 | The external API returns all categories in one call (answered). What is its input (a month, or a date range) and how is a category mapped to its key (name today)? | Shapes the mapping in BE-A |
| Q-2 | Does the external API rate-limit, and how fresh can its figures be? | Sets the cache time and the timeout in BE-A |
| Q-3 | Can expenses be recorded in categories that have an envelope? If yes, does the external spend already include them? | Without an answer the same money could be counted twice in Total expenses (expense total + envelope spend) |
| Q-4 | Is `spentAmount: null` on failure acceptable, or does the backend prefer a separate `spendStatus` field (`ok`, `unavailable`)? | Frontend treats `null` as "unavailable" |
| Q-5 | BE-B and BE-C: nested object or flat fields? | Only affects the frontend's mapping |
| Q-6 | Who applies the billing-cycle rule, the external spend API or this backend? Does the external API know the payment type and its due date, or only the category and a date? | If the backend must apply it, BE-A needs per-purchase data (not a monthly total) plus each payment type's cycle, which is a bigger change |
| Q-7 | Where is a payment type's due date stored? `PaymentType` has only `name` and `hasStatement`, and no document defines a billing cycle | The cycle rule can't be computed without it |
