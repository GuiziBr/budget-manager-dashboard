# T-06 — Backend Requirements

Status: draft · Last updated: 2026-11-03

What the backend needs to change so the Month table can sort by Category and Payment (task **T-06**, see [the frontend plan](../plans/t-06-expense-sort.md)). It is one change to `GET /expenses` (BE-4) plus three documentation clarifications. The # column (row type) is not sortable and needs nothing from the backend.

**Nothing here blocks T-06.** The frontend ships sorting for Item, Due, Paid and Amount against the API as documented today. BE-4 only unlocks the Category and Payment headers.

Related: [Month spec](month-screen.md) (M-06) · [Backlog](todo.md) (BE-4) · [Expense API](APIs/expense.md)

---

## 1. What the API docs say today

Checked against [expense.md](APIs/expense.md) as of 2026-11-03 (last change: commit `f67b233`; no newer API docs are in the repository).

`GET /expenses` accepts `sortBy` = `description`, `amount`, `purchasedAt`, `dueAt`, `paidAt`, `installmentNumber`, `createdAt` or `updatedAt`, and `sortOrder` = `asc` or `desc` (default `createdAt` / `desc`). Nullable fields sort **nulls last in both directions**, ties are broken by `id`, and `totalAmount` covers the whole filtered set. An unknown value is a `400`.

| Month table column | Needs | Covered today? |
|---|---|---|
| Item | `description` | Yes |
| Due | `dueAt` | Yes (no due date goes last) |
| Paid | `paidAt` | Yes (unpaid goes last) |
| Amount | `amount` | Yes |
| Default order | `createdAt` desc | Yes |
| # (installment `n of N`, recurring "Month 11", one-time empty) | nothing: not sortable by design | n/a |
| **Category** | the category **name** | **No** |
| **Payment** | the payment type **name** | **No** |

The # column is deliberately not sortable, so `installmentNumber` and the row type are not needed.

## 2. Summary

| ID | Change | Priority | Needed by T-06? |
|---|---|---|---|
| BE-4 | New `sortBy` values for the category name and payment type name | Should | No (only T-21's two extra headers) |
| D-1 | Document how `description` is compared | Should | No (affects what the user sees) |
| D-2 | Document that sorting applies before pagination for every key | Could | No |
| D-3 | Document `sortBy` / `sortOrder` in the list's error cases | Could | No |

---

## 3. BE-4 — Sort by category and payment type

### Why
The table's Category and Payment headers can't sort today: an expense only stores ids. The frontend must not sort one page in the browser (spec M-06), so the server has to.

### Proposed change
Add two values to `sortBy` on `GET /expenses`. Existing values and defaults don't change.

| `sortBy` | Sorts by | `asc` order |
|---|---|---|
| `categoryName` | the category's name | A to Z |
| `paymentTypeName` | the payment type's name | A to Z |

The names are suggestions: the frontend adapts to whatever keys the backend picks, as long as they are documented.

### Rules
- **Names** are the names already returned in `category.name` and `paymentType.name`, **including soft-deleted lookups** (the same behaviour as the nested objects), so the order matches what the user sees.
- **Case-insensitive** comparison for names ("bills" next to "Bills"), the same as the user would expect from a list of chips.
- **No nulls:** category and payment type are required, so "nulls last" doesn't apply.
- **Ties are broken by `id`**, as today, so paging stays stable.
- `desc` reverses the order of the key and the `id` tie-break together (both descending), matching how the existing keys behave today.
- Done in the same query as the page (a join on the lookups the response already resolves), not one query per row.
- An unknown `sortBy` is still a `400`.

### Acceptance
- *Given* 45 expenses in one period, *when* the list is requested with `sortBy=categoryName&sortOrder=asc&limit=20&page=1`, *then* page 1 holds the 20 expenses with the alphabetically first category names of the **whole** period, and pages 2 and 3 continue the order with no repeats or gaps.
- *Given* an expense whose category was soft-deleted, *then* it sorts by the category's stored name, the same name `category.name` shows.
- *Given* categories "bills" and "Bills", *then* they sort as neighbours.
- *Given* `sortBy=categoryName` with `sortOrder` omitted, *then* the default order (`desc`) applies, as for every key.
- *Given* `sortBy=invalid`, *then* the response is `400`.
- `totalAmount` and `total` are the same for every `sortBy`.

### Docs to update
[expense.md](APIs/expense.md): the `sortBy` row of the query table, plus one line per new key describing the order above.

### Rollout
Additive and backwards compatible. The frontend keeps the new keys out of its sort mapping until the backend is deployed (an unknown key would be a `400`), then adds them and enables the two headers (T-21). Tell the frontend the deployed key names and the date.

---

## 4. Documentation clarifications

None of these need code unless the answer differs from the assumption.

| ID | Question | Frontend assumption | Why it matters |
|---|---|---|---|
| D-1 | How is `description` compared: case-insensitive? accents? | Case-insensitive, so "hydro" and "Hydro" are neighbours | The Item sort is user-visible; a case-sensitive sort puts every lower-case description after "Z" |
| D-2 | Does `amount` sort numerically (decimal), not as text? | Numeric | "1000.00" must come after "999.00" |
| D-3 | Does the sort apply to the whole filtered set before the page is cut, for every key? | Yes (the docs say "across all pages" only implicitly) | The Month screen depends on it for M-06's acceptance criteria |

If D-1 is case-sensitive today, the fix is a case-insensitive comparison on `description`, with `id` as the tie-break.

---

## 5. Already tracked elsewhere (not T-06)

Found while reading the API docs; no new action, listed so they aren't lost.

| Item | Where | Affects |
|---|---|---|
| G-1: resolved — `PATCH` and `DELETE /expenses/:id` no longer return `422` for past months (guard removed in #30); only [budget-envelope.md](../APIs/budget-envelope.md) keeps a past-period rule | [todo.md](todo.md) | T-34 |
| BE-3: resolved — past-month expenses are fully editable, so `paidAt` alone is allowed | [todo.md](todo.md) | T-25, T-34 |
| G-12: category name on envelopes | [todo.md](todo.md) | T-19, T-24 |
