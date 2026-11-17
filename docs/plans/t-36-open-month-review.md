# T-36 Open-month review: bills, installments, envelopes — Implementation Plan

Status: draft · Last updated: 2026-11-17

Detail plan for T-36 of [month-screen-implementation.md](month-screen-implementation.md). One pull request: `feat(month): review a month after opening it`.

Related: [Month spec](../specs/month-screen.md) (M-02, M-22, §4) · [Budget period API](../APIs/budget-period.md) · [Expense API](../APIs/expense.md) · [Backlog](../specs/todo.md) (BE-1)

---

## 1. Scope

After **Open {Month}** succeeds (T-35), a review sheet opens over the new month with three sections:

| Section | Content | Editable | Saved by Done |
|---|---|---|---|
| Recurring bills | each generated bill, name and amount | amount | `PATCH /expenses/:id` `{ amount }` per changed row |
| Installments | each generated payment: name, `n of N`, amount, "Last payment" tag on the final one | no | — |
| Envelopes | category, budget | no (M-22 edits them later) | — |

**Done** saves the changed bill amounts and closes the review. Closing any other way (X, Escape, dimmed page) keeps the month as generated. Each section has its own loading, error and **Retry**.

**Out of scope:** the Income section and the salary requests (T-37; the review is built so T-37 adds a fourth section without touching the others), editing installments or envelopes, the open request itself (T-35, done).

Acceptance (M-02): criteria 1, 2 and 4 pass in this task; criterion 3 (salary) is T-37.

---

## 2. Findings from the code

- `MonthScreen` already owns the open call ([MonthScreen.tsx:136](../../src/components/month/MonthScreen.tsx#L136)) via `useCreateBudgetPeriod`. It can read the new period from the `onSuccess` argument, so the review is opened **only on a 201**; the 409 path ("already open") must not open it.
- `useUpdateExpense()` already exists and invalidates `["expenses"]` on settle. It is per-row and non-optimistic when called without options, which is what we want (the review isn't the table).
- `useMonthExpensesPage` returns pages of 10 and keeps the previous page, which is built for the table, not for a review that needs **every** row of the month. The API allows `limit` up to 100.
- `Expense` already carries what the sections need: `recurringExpenseId` / `monthsRunning` (bills), `installmentNumber` + `installment.totalInstallments` (installments, "Last payment" = `installmentNumber === totalInstallments`), nested `category` / `paymentType` names.
- `useMonthEnvelopes(periodId)` returns the envelopes with spend; G-12 applies (category name from the categories lookup, "(deleted)" when missing; reuse what `EnvelopesCard` does).
- `DetailsSheet` is the shared panel frame (right panel / bottom sheet, `fullHeight`, `separated`, `titleAside`). `IncomeFormPanel` and `EnvelopeFormPanel` are the templates for a form-like panel (react-hook-form, `formatMoneyInput`, `checkMoney`, `parseMoney`, `onSavingChange` to block dismissal during a save).
- `MonthScreen` resets every panel when the month changes (the `panelMonth` block); the review joins that list.
- The PATCH of a generated bill changes **that row only**; the recurring template is untouched (confirmed for T-29/T-30). This is what criterion 2 ("Hydro template is unchanged") needs.

---

## 3. Work breakdown

Pure logic first, then data, then UI.

### 3.1 Review model (`src/lib/month-review.ts`)
- `splitReviewExpenses(expenses)` → `{ bills, installments }`. A bill has `recurringExpenseId !== null`; an installment has `installment !== null`. Anything else (one-time) is ignored, since a month opened seconds ago has none. Order: alphabetical by description, installments with the last payments easy to spot.
- `isLastPayment(expense)` → `installmentNumber === installment.totalInstallments`.
- `changedBillAmounts(bills, edits)` → `[{ id, amount }]` for rows whose parsed amount differs from the loaded one. Rows with an invalid or empty edit are reported separately so the form can block Done.
- `sortReviewEnvelopes` → reuse `sortEnvelopes` from `lib/month-rows.ts` (alphabetical by category).
- Tests: split with all three row kinds, last-payment edge (plan of 2, plan of 1 is not creatable), unchanged edit not sent, `105.00` → `112.40` produces one change, invalid amount.

### 3.2 Data hook (`src/hooks/use-month-review.ts`)
- `useReviewExpenses(periodId)`: loads **all** the month's expenses, `limit=100`, following pages until `data.length >= total`, in one query keyed under `["expenses", "review", periodId]` (so every expense invalidation refreshes it). Returns `{ bills, installments, isLoading, isError, refetch }`.
- Envelopes: reuse `useMonthEnvelopes`.
- Both queries are independent so each section can load, fail and retry on its own.
- Tests: one page, two pages (101 rows), error then refetch, idle while the period is unknown.

### 3.3 Saving the bills (`src/hooks/use-save-review-bills.ts`)
- Takes the list from `changedBillAmounts` and sends one `PATCH` per row **in parallel** with `Promise.allSettled`, using `useUpdateExpense().mutateAsync`.
- Returns per-row results `{ id, status: "saved" | "failed" }`. Rows already saved are dropped from the next attempt, so **Retry sends only the failed rows** (a PATCH is idempotent, so a lost response is safe to resend).
- Tests: all succeed, one fails (the others are kept, the failed id is returned), retry sends only the failed one.

### 3.4 UI (`src/components/month/`)
- `OpenMonthReview.tsx`: the sheet (`DetailsSheet`, `fullHeight` on the phone, `separated`), title "Review {Month}" with a short intro ("Check what was generated. Edit amounts before you start the month."), three section components and the footer buttons **Done** and **Close**.
  - Done is disabled while saving and when any edited amount is invalid. With no edits it just closes (no request).
  - While saving, dismissal is blocked (`onSavingChange`, as the forms do).
  - On full success it closes with a success toast ("{Month} is ready"). On partial failure it **stays open**; the failed rows show a red border and the section shows the error with **Retry**; the saved rows are shown as saved and locked to their new amount.
- `ReviewBillsSection.tsx`: a row per bill, description + category, amount input (the `$` icon and `formatMoneyInput`, same as the expense form), skeleton while loading, empty line "No recurring bills", error + Retry.
- `ReviewInstallmentsSection.tsx`: read-only rows with the `n/N` chip (`ExpenseTypeChip`), the **Last payment** `Badge`, amount; empty line "No installments due this month".
- `ReviewEnvelopesSection.tsx`: read-only rows, category and budget; an envelope with a 0 default budget is shown as is (the backend gives `0` to any category outside its default table). Empty line "No envelopes".
- `MonthScreen.tsx`: state `reviewing` (period id), set in the open mutation's `onSuccess`, cleared on month change and by `onClose`. T-37's Income section slots in below the three.
- `src/constants/translations.ts`: every string (`month.review.*`), including the aria labels for amount inputs ("Amount for {name}").
- Components stay thin; the grouping, diffing and parsing live in 3.1.

### 3.5 Tests
- `OpenMonthReview.test.tsx`: shows the three sections from fixtures; editing Hydro to `112.40` and Done sends one `PATCH` with `{ amount: 112.4 }` and closes; Done with no edits sends nothing; closing with X sends nothing; one `PATCH` failing keeps the review open, shows the error and Retry sends only that row; a failing section load shows its own Retry while the others render; Last payment tag appears only on the final payment.
- `MonthScreen.test.tsx`: a 201 opens the review; a 409 does **not**; changing month closes it.

---

## 4. Design

- Check the matching frames in `design.pen` first (the spec does not say whether a review frame exists; T-32 and T-33 shipped without frames). If there is none, build it from the expense form's panel (14px labels, 20px title, separator) and add a frame afterwards.
- Light and dark, desktop and 390px. At 390px the amount inputs go under the description (stacked), nothing scrolls horizontally, and the footer buttons stay reachable (sticky).

---

## 5. Backend

**Nothing blocks T-36.** Every request exists today:

| Need | Endpoint |
|---|---|
| Generated rows | `GET /expenses?budgetPeriodId=&limit=100&page=n` |
| Envelopes | `GET /budget-envelopes?budgetPeriodId=` |
| Save an amount | `PATCH /expenses/:id` `{ amount }` (one row only) |

Things worth knowing, none blocking:

1. **No way to ask only for bills or installments.** `GET /expenses` has no type filter, so the review loads the whole month (100 per page) and splits it in the browser. Fine for a freshly opened month. *Optional:* a `type` (or `hasRecurring` / `hasInstallment`) filter.
2. **No bulk update.** Done is N `PATCH` requests, not a transaction, so a partial save is possible. The design handles it (per-row retry); *optional:* `PATCH /expenses` in bulk, or accepting amount overrides in `POST /budget-periods`.
3. **`POST /budget-periods` doesn't return what it generated**, so the review needs the two follow-up reads. *Optional:* return counts or ids.
4. **BE-1 (salary with the month)** does not affect T-36; it matters for T-37 and could change T-35 (the Open request would carry the salary, which means the review's salary choice would have to come before opening). That is the one open decision with a real cost, so it is worth settling before T-37, not after.
5. **G-12** (category name on envelopes) still applies to the envelope rows: "(deleted)" until the backend returns `category: { id, name }`.
6. **Docs:** `docs/APIs/budget-period.md` says generated installment rows have `purchasedAt = null`; the review doesn't depend on it.

---

## 6. Risks and decisions to confirm

- **Reload loses the review.** The state is local to the screen, not in the address. After a reload the month is simply opened with its generated rows (the spec's own "close without Done" outcome). Confirm this is acceptable; the alternative is `?review=1`, which also reopens it on later visits and is probably wrong.
- **Is the "Last payment" tag also wanted on the table?** The spec only asks for it in the review; the plan keeps it there.
- **Month with more than 100 rows** is handled by paging; a month with several hundred would make the review slow to open, which is not realistic for this app.

## 7. Browser verification (Chrome DevTools, real API)

Run after the component tests pass, with the dev server and the dev backend. Use a throwaway future month (for example the month after the latest opened one) and delete it at the end (delete its generated rows and envelopes first, M-03).

**Functional**
1. Open the unopened month, confirm the dialog, click Open. Network: one `POST /budget-periods` (201), then `GET /expenses?budgetPeriodId=…&limit=100` and `GET /budget-envelopes?…`. The review opens with the three sections matching the table and envelope card behind it.
2. Edit a bill (for example Hydro 105.00 → 112.40) and click Done. Network: exactly one `PATCH /expenses/:id` with `{"amount":112.4}`; the table row shows `CAD 112.40`; the recurring bill's template (Recurring screen or `GET /recurring-expenses/:id`) is unchanged.
3. Done with no edits sends no request and closes. Close with X, Escape and the dimmed page: no request, month keeps its generated rows and has no incomes.
4. Installments: `n of N` is right and only the final payment has the Last payment tag.
5. Failure paths: block one `PATCH` (network request blocking for that URL) and click Done. The review stays open, that row is marked failed, the section shows Retry, and Retry sends only that row. Block `GET /budget-envelopes` before opening: only the Envelopes section shows its error and Retry.
6. Opening a month that already exists (create it in another tab first) toasts "{Month} is already open." and does **not** open the review.
7. Switching month with the review open closes it. Back button and reload leave the month as generated.
8. Keyboard: focus lands in the sheet, Tab stays inside it, Escape closes it, focus returns to the page; the amount inputs have accessible names.
9. Console: no errors or warnings; no `PATCH` or `GET` repeated beyond the list above.

**Visual**
- Compare against the matching `design.pen` frame if one exists, otherwise against the expense form panel.
- Screenshots in light and dark at desktop width and at 390px (`emulate`/`resize_page`): sections, loading skeletons, an error section, a failed row, the Last payment tag, a long bill name truncating.
- At 390px: measure `document.documentElement.scrollWidth <= innerWidth` (no horizontal scroll), inputs stacked under the name, Done and Close visible without scrolling the whole page, tap targets at least 44px.
- Contrast of the red failed border and the Last payment badge in both themes.

Record what was checked, and what wasn't, in the task's **Status** line in the implementation plan, as earlier tasks do.

---

## 8. Done when

- The first, second and fourth M-02 acceptance criteria pass: the review lists the generated bills, installments and envelopes; Hydro 105.00 → 112.40 shows `CAD 112.40` in the table and leaves the template alone; closing without Done leaves the month as generated.
- A failed save keeps the review open with a per-section Retry; a failed section load retries on its own.
- `npm run check`, `npm run build` and `npm run test:cov` are green; the browser checks in §7 are done against the real API (test month deleted afterwards).
