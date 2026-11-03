# T-05 — Row model, totals and status

Status: implemented · Last updated: 2026-11-03

Detailed plan for task **T-05** of the [Month screen implementation plan](month-screen-implementation.md). One pull request, size M.

Related: [Month spec](../specs/month-screen.md) (§2, M-04, M-05, M-09, M-13) · [Expense API](../APIs/expense.md) · [Budget envelope API](../APIs/budget-envelope.md) · [Backend requirements (delivered)](../specs/t-05-backend-requirements.md)

---

## 1. Branch and PR

- Stack: `feat/month-maths` → `feat/api-types-update` (types and docs aligned with the delivered backend) → `feat/month-rows` (this task).
- T-05 needs the updated types (nested expense lookups, `installment`, `monthsRunning`, envelope `spentAmount`), so it is based on `feat/api-types-update`. It uses nothing from T-03 or T-04.
- Retarget each PR to `development` as the one below it merges.
- Commit: `feat(month): add row model, totals and status`.

## 2. Scope

**In:** `src/lib/month-rows.ts` and `src/lib/month-rows.test.ts`. Pure functions, no React, no fetching, no `Date.now()` (the clock is always a parameter).

**Out:** hooks (T-12 to T-15), components (T-18 onwards). Labels such as "(deleted)", "Overdue" and "Month 11" are UI text and go in `translations.ts` later.

## 3. Design

The backend now sends everything a row needs: category, payment type, bank and store names (even for deleted lookups), the installment plan (`totalInstallments`, interval, first purchase) and `monthsRunning`. Envelopes carry `spentAmount`. So the module takes **no lookup maps and no installment-group maps**; the only map is the category names used to label envelopes.

| Function | Behaviour |
|---|---|
| `rowType(expense)` | `installment` set → installment; else `recurringExpenseId` set → recurring; else one-time |
| `isUnpaid(expense)` | `paidAt === null` |
| `isOverdue(expense, now)` | unpaid, has a `dueAt`, and the due **UTC day** is before today's UTC day. Due today is not overdue. Any month (M-13) |
| `buildRows(expenses, now)` | One page → `MonthRow[]`, **same order as the API**. Names, `installment { number, total, paymentIntervalDays, firstPurchasedAt }`, `monthsRunning`, `unpaid`, `overdue` |
| `installmentEndDate(plan)` | `firstPurchasedAt + (total − 1) × interval` days, UTC, `YYYY-MM-DD`. Takes `{ firstPurchasedAt, totalInstallments, paymentIntervalDays }`, so it accepts both an `InstallmentGroup` and `expense.installment` |
| `envelopeStatus(envelope, categoryNames)` | `spent` is `envelope.spentAmount`. Returns `categoryName` (`null` if the category isn't in the map, G-12), `allocated`, `spent` (`null` when the spend service was down), `ratio` (`null` when spent is `null` or allocated is 0), `overBudget` (`spent > allocated`, never while `null`) |
| `sortEnvelopes(statuses)` | Over budget first, otherwise the given order; returns a new array |
| `totals({ expenseTotal, envelopes, incomes })` | `expenseTotal` is `totalAmount` from `GET /expenses`, not a sum over the page. `expenses = expenseTotal + Σ spentAmount` (`null` counts as 0). Returns `income`, `expenses`, `balance`, `salaryBase` and `spendComplete` (false when any envelope's spend is `null`, so the Expenses card keeps "Envelope spend not included yet") |

### Decisions

- **Money maths in cents**, converted back at the end, so `7375.67 − 6530.48` is `845.19`.
- **UTC dates compared as `YYYY-MM-DD` strings**, the same reference as the backend (spec §2).
- **No sorting of rows.** Row order is the server's (M-06).
- **`installment.number` can be `null`** if the API sent an installment expense without its number. The type says it is always set, so this is defensive and the UI can ignore it.
- **No strings** in the module.

## 4. Tests

29 tests in `month-rows.test.ts`, reproducing the spec examples:

| Case | Expected | Spec |
|---|---|---|
| `totalAmount` 6,013.62 + envelope spend 300.50 + 216.36; income 7,375.67 | expenses 6,530.48, balance 845.19 | M-04 |
| Income 1,000 against 1,120 | balance −120 | M-04 |
| Salary incomes 3,000 and 3,144 plus one other | salary base 6,144 | §2, M-07 |
| Envelope spend `null` | counts as 0, `spendComplete` false | §2, M-11 |
| No envelopes | `spendComplete` true | M-04 |
| Hydro due 2026-11-12 unpaid, today 2026-11-15 | overdue; not when paid, due today, later or without a date | M-13 |
| Unpaid October row viewed in November | overdue | M-13 |
| Due 14 Nov, now 14 Nov 23:59 UTC / 15 Nov 00:00 UTC | not overdue / overdue | §2 |
| Car finance 78 and 79 of 104 | two rows in API order, plan fields present | M-09 |
| Recurring row with `monthsRunning: 11` | passes through | M-10 |
| Deleted lookup | name comes from the expense | G-3 resolved |
| 104 payments, 14 days, from 2023-11-10 | end date 2027-10-22 | M-08 |
| 12 payments, 30 days, from 2026-11-15 | end date 2027-10-11 | M-15 |
| Envelope 120 of 100 / 100 of 100 / allocation 0 / spend `null` | over / not over / over with no ratio / not over, no ratio | M-04, M-11 |
| Unknown category id | `categoryName` null | G-12 |
| Two over-budget among five envelopes | over-budget first, original order inside each group | M-04 |
| Inputs | not mutated | — |

## 5. Done when

- The tests pass and the module is at or above the 90% bar for `src/lib/`.
- `npm run check`, `npm run build` and `npm run test:cov` are green.
- The module imports no React, no `fetch`, and doesn't read the clock.

## 6. Backend

Nothing pending for T-05. One related gap: **G-12**, envelopes carry only `categoryId`, so an envelope whose category was deleted later can't be named. `categoryName` is `null` in that case and the UI shows "(deleted)" until the backend returns `category: { id, name }` on envelopes.
