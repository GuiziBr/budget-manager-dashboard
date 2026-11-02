# Month Screen — Implementation Plan

Status: draft 1 · Last updated: 2026-11-02

Breaks the [Month screen spec](../specs/month-screen.md) and the wireframes in `design.pen` into small tasks. Each task is one pull request to `development`, sized to be reviewed in one sitting.

Related: [Month spec](../specs/month-screen.md) · [Backlog](../specs/todo.md) · [API docs](../APIs/api-reference.md) · [Design system](../../DESIGN_SYSTEM.md)

---

## 1. How to work through it

- **One task, one PR**, with a conventional commit title (`feat(month): …`). A task is done when its "Done when" checks pass and `npm run check`, `npm run build` and `npm run test:cov` are green.
- **Order:** phases run top to bottom. Inside a phase, tasks without a dependency can be done in parallel.
- **Ship read-only first.** Phases 1–3 give a Month screen you can look at with real data before any form exists. Actions come after.
- **Logic in `src/lib/`, UI in components.** Calculations (totals, overdue, sorting, month maths) are pure functions with tests, held to the 90% coverage bar. Components stay thin.
- **Every screen task** is checked in light and dark, on desktop and at 390px, against the matching `design.pen` frame.
- **Strings** go in `src/constants/translations.ts`; **colours** only through tokens.

---

## 2. Task overview

| ID | Task | Phase | Spec | Depends on | Size | Backend |
|---|---|---|---|---|---|---|
| T-01 | Domain types | 0 Foundations | §5 | — | S | — |
| T-02 | API client: JSON-paged lists and fetch-all | 0 | §5 | T-01 | S | — |
| T-03 | Month maths (`lib/month.ts`) | 0 | M-01, M-25 | — | S | — |
| T-04 | Money formatting (`lib/money.ts`) | 0 | §2 | — | S | — |
| T-05 | Row model, totals and status (`lib/month-rows.ts`) | 0 | §2, M-05, M-09, M-13 | T-01 | M | G-5 |
| T-06 | Table sorting (`lib/sort-rows.ts`) | 0 | M-06 | T-05 | S | — |
| T-07 | API error messages (`lib/api-error-message.ts`) | 0 | §4 | T-02 | S | — |
| T-08 | UI primitives: Card, Badge, Checkbox, Progress, Skeleton | 0 | — | — | M | — |
| T-09 | Navigation: Month, Recurring, Settings | 0 | A-01, A-02 | — | S | — |
| T-10 | Lookup hooks (categories, payment types, banks, stores) | 1 Data | §5 | T-02 | S | — |
| T-11 | Budget period hooks | 1 | M-01 | T-02 | S | — |
| T-12 | Expense hooks | 1 | M-05 | T-02 | M | — |
| T-13 | Income hooks | 1 | M-07 | T-02 | S | — |
| T-14 | Envelope hooks | 1 | M-04 | T-02 | S | G-5 |
| T-15 | Installment group hooks | 1 | M-09, M-19 | T-02 | S | G-2 |
| T-16 | Month route and month switcher | 2 Read-only screen | M-01 | T-03, T-11 | M | — |
| T-17 | Month states: loading, error, not opened, not tracked, closed | 2 | M-01, M-02, M-25 | T-16 | S | — |
| T-18 | Summary cards | 2 | M-04 | T-05, T-08, T-12–T-14 | S | G-5 |
| T-19 | Envelopes card (collapsible) | 2 | M-04, M-11 | T-05, T-08, T-14 | M | G-5 |
| T-20 | Month table (desktop) | 2 | M-05, M-09, M-10, M-13 | T-05, T-08, T-10, T-12, T-15 | L | G-2, G-3, G-5, G-6 |
| T-21 | Sortable columns | 2 | M-06 | T-06, T-20 | S | — |
| T-22 | Phone layout: list, envelope strip, add button | 2 | M-05, M-04 | T-18–T-20 | M | — |
| T-23 | Income panel (read) | 3 Panels | M-07 | T-13, T-18 | M | — |
| T-24 | Row details panel (read) | 3 | M-08 | T-20 | M | G-3, G-5, G-6 |
| T-25 | Mark paid / unpaid | 4 Actions | M-12 | T-12, T-20, T-24 | S | BE-3 |
| T-26 | Expense form: shared fields and one-time | 4 | M-14, M-26 | T-07, T-10, T-12 | L | — |
| T-27 | Expense form: installments | 4 | M-15 | T-26 | M | — |
| T-28 | Expense form: recurring | 4 | M-16 | T-26 | S | G-4 |
| T-29 | Edit expense | 4 | M-17 | T-26 | M | G-3 |
| T-30 | Delete expense | 4 | M-18 | T-12, T-24 | S | — |
| T-31 | Change an installment plan's amount | 4 | M-19 | T-15, T-24 | S | — |
| T-32 | Add, edit, delete income | 4 | M-20, M-21 | T-13, T-23 | M | — |
| T-33 | Add and delete envelopes | 4 | M-23, M-24 | T-14, T-19 | S | — |
| T-34 | Closed-month guard (422 → read-only) | 4 | M-25 | T-07, T-17 | S | G-1, BE-3 |
| T-35 | Open a month | 5 Month lifecycle | M-02 | T-11, T-17 | S | BE-1 |
| T-36 | Open-month review: bills, installments, envelopes | 5 | M-02 | T-35 | M | — |
| T-37 | Open-month review: salary | 5 | M-02 | T-36, T-13 | M | BE-1 |
| T-38 | Delete an empty month | 5 | M-03 | T-11, T-16 | S | — |
| T-39 | Final pass: themes, 390px, accessibility, clean-up | 6 Polish | all | everything | M | — |

Size: **S** ≈ half a day, **M** ≈ a day, **L** ≈ two days.

---

## 3. Tasks

### Phase 0 — Foundations

#### T-01 Domain types
- **Goal:** TypeScript types for every API resource the screen uses.
- **Includes:** `src/types/` (or `src/lib/types.ts`): `BudgetPeriod`, `Expense`, `Income`, `BudgetEnvelope`, `InstallmentGroup`, `RecurringExpense`, `Category`, `PaymentType`, `Bank`, `Store`, and the `POST /expenses` body as a union on `type` (`one-time` | `recurring` | `installment`). Field names follow `docs/APIs/`.
- **Done when:** the types compile and match the API docs field by field.

#### T-02 API client: JSON-paged lists and fetch-all
- **Goal:** read `GET /expenses`, which returns `{ data, total, page, limit }` in the body. `getWithHeaders` expects an `x-total-count` header instead, so it doesn't fit.
- **Includes:** a typed `getPage<T>()` in `src/lib/api.ts`, and `fetchAllPages<T>(endpoint, limit = 100)` that keeps requesting pages until `total` is reached (M-05: no pagination on screen).
- **Done when:** unit tests cover one page, several pages and an empty list.

#### T-03 Month maths (`lib/month.ts`)
- **Goal:** every month decision in one tested module, in **UTC** (spec §2).
- **Includes:** `currentMonth()`, parse/format `?period=YYYY-MM`, `prevMonth` / `nextMonth` with the upper limit (December of next year), `compareMonth` → past / current / future, `monthLabel` ("November 2026"), `findPeriod(periods, month)`.
- **Done when:** tests cover year boundaries, the upper limit, invalid `period` values (falling back to the current month) and the UTC edge at month end.

#### T-04 Money formatting (`lib/money.ts`)
- **Goal:** one formatter for every amount on screen.
- **Includes:** `formatCad(value, { sign })` → `CAD 1,450.00`, `+ CAD 6,144.00`, `- CAD 120.00` (negative balance only), plus the bare form used on the phone (`1,450.00`).
- **Done when:** tests cover thousands, rounding to 2 decimals, zero and negatives.

#### T-05 Row model, totals and status (`lib/month-rows.ts`)
- **Goal:** turn API data into what the screen shows.
- **Includes:**
  - `rowType(expense)` → one-time / installment / recurring; envelopes become rows of type envelope.
  - `buildRows(expenses, envelopes, lookups, groups)` in order of entry, oldest first (the API returns newest first).
  - `isUnpaid`, `isOverdue(row, today)` (unpaid and due before today, any month).
  - `totals(expenses, envelopes, incomes)` → income, expenses (**expense amounts + envelope spend**, spend = 0 until the API exists), balance, salary base.
  - `envelopeStatus` (spent, allocated, ratio, over budget) and `sortEnvelopes` (over budget first).
  - `installmentEndDate(group)` = first purchase + (N − 1) × interval days.
- **Done when:** tests reproduce the spec examples (Expenses 6,530.48 and Balance 845.19, Hydro overdue on 2026-11-15, Car finance 78 and 79 in one month).
- **Backend:** G-5 (envelope spend). Until it lands, spend is 0 in `totals` and `envelopeStatus`. Keep spend as one input so the API can be plugged in without changing the callers.

#### T-06 Table sorting (`lib/sort-rows.ts`)
- **Goal:** sort by every column with three states: ascending, descending, order of entry.
- **Includes:** sort keys from M-06 (# by row type, Paid by paid date with unpaid first, Spent by amount spent), rows without a value last, a stable sort.
- **Done when:** tests cover every column and the reset on the third click.

#### T-07 API error messages (`lib/api-error-message.ts`)
- **Goal:** map backend errors to the messages in spec §4.
- **Includes:** 409 (month exists, month not empty, envelope exists), 400 (bank required, no period for installments), 404 (lookup gone), 422 (month closed), network / 500. Builds on `get-error-message.ts`.
- **Done when:** each row of the spec's §4 table has a test.

#### T-08 UI primitives
- **Goal:** the building blocks the design uses that `src/components/ui/` lacks.
- **Includes:** `card.tsx`, `badge.tsx` (chips and the Salary / Overdue / over-budget pills, `*-soft` variants), `checkbox.tsx` (paid control, 44px touch target on the phone), `progress.tsx` (envelope bar, danger variant), `skeleton.tsx`.
- **Done when:** each has a small test, and they match `DESIGN_SYSTEM.md` in both themes.

#### T-09 Navigation
- **Goal:** the shell lists Month, Recurring and Settings (A-01, A-02).
- **Includes:** `src/lib/navigation.ts` entries and titles; `DEFAULT_PATH` becomes `/month`; Recurring and Settings pages render an empty "Coming soon" state for now; remove the old `/dashboard` page.
- **Done when:** the sidebar and tab bar show the three entries, and the navigation tests are updated.
- **Note:** moving the theme switch to Settings (A-03) waits for the Settings screen; until then it stays where it is.

### Phase 1 — Data hooks

One file per entity in `src/hooks/`, following the project rule: `useX` for reads, `useCreateX` / `useUpdateX` / `useDeleteX` for mutations that invalidate the entity's query key. Each task includes tests with `src/test/query-wrapper.tsx`.

#### T-10 Lookup hooks
- `use-categories.ts`, `use-payment-types.ts`, `use-banks.ts`, `use-stores.ts` (reads only for now; long cache time, the lists rarely change).

#### T-11 Budget period hooks
- `use-budget-periods.ts`: `useBudgetPeriods`, `useCreateBudgetPeriod`, `useDeleteBudgetPeriod`.

#### T-12 Expense hooks
- `use-expenses.ts`: `useMonthExpenses(periodId)` (all pages, T-02), `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`.
- `useUpdateExpense` supports an **optimistic** update, used by mark paid (T-25).

#### T-13 Income hooks
- `use-incomes.ts`: `useMonthIncomes(periodId)`, `useCreateIncome`, `useUpdateIncome`, `useDeleteIncome`.

#### T-14 Envelope hooks
- `use-budget-envelopes.ts`: `useMonthEnvelopes(periodId)`, `useCreateEnvelope`, `useDeleteEnvelope`. No update hook (M-22).
- **Backend:** G-5 (envelope spend). No spend hook yet. When the API lands, add it here (or extend `useMonthEnvelopes`) and feed it to T-05.

#### T-15 Installment group hooks
- `use-installment-groups.ts`: `useInstallmentGroups(ids)` (one query per plan in the month) and `useUpdateInstallmentGroup` (invalidates the expenses of every month it touches).
- **Backend:** G-2 (plan size on expenses). For now, one `GET /installment-groups/:id` per plan. If expenses start returning `totalInstallments`, interval and first purchase date, drop the per-plan reads and keep only the update hook.

### Phase 2 — Read-only Month screen

#### T-16 Month route and month switcher (M-01)
- **Includes:** `src/app/(app)/month/page.tsx`; the selected month read from and written to `?period=`; the header with the previous and next arrows; the month name opening a list of opened months grouped by year; a header menu (⋯) placeholder.
- **Done when:** the three M-01 acceptance criteria pass, and the back button returns to the previous month.

#### T-17 Month states (M-01, M-02, M-25)
- **Includes:** skeletons while loading; an inline error with Retry; "{Month} hasn't been opened yet" with an Open button (wired up in T-35); "{Month} wasn't tracked in the app" for past months never opened; the closed banner for past months, and a `useMonthAccess()` (or similar) that tells components whether actions are allowed.
- **Done when:** each state matches its `design.pen` frame (Not opened, Past month).

#### T-18 Summary cards (M-04)
- **Includes:** Income (with View all, wired in T-23), Expenses (with the "Envelope spend not included yet" note while spend is missing) and Balance, in that order; totals from T-05.
- **Done when:** the M-04 acceptance criteria pass.
- **Backend:** G-5 (envelope spend). Show the "Envelope spend not included yet" note on the Expenses card until spend is available; remove it when it lands.

#### T-19 Envelopes card (M-04, M-11)
- **Includes:** a 4-column grid with name, spent / allocated and a bar; over-budget first and in the danger colour; the "{n} over budget" pill; Hide / Show remembered in `localStorage` (wrapped in try/catch); spend placeholder "—" until the API exists; clicking an envelope opens its details (wired in T-24).
- **Done when:** it matches the expanded and collapsed `design.pen` frames, and the over-budget pill stays visible when collapsed.
- **Backend:** G-5 (envelope spend). Until it lands, every spent value and bar shows "—" and the over-budget pill never appears. Use example spend in tests and stories so the real layout is covered.

#### T-20 Month table, desktop (M-05, M-09, M-10, M-13)
- **Includes:**
  - columns #, Item, Category, Payment, Due, Paid, Amount, Spent, plus a row menu;
  - the type chip: `n/N` for installments, "Month —" for recurring rows, Env for envelopes;
  - left-aligned cells and no total row;
  - paid rows dimmed, with the checkbox at full strength (read-only until T-25);
  - overdue due dates in red with the alert icon and a screen-reader label;
  - "(deleted)" for lookups the list no longer returns (gap G-3);
  - the empty state "No expenses yet";
  - clicking a row selects it (the details panel opens in T-24).
- **Done when:** the M-05 acceptance criteria pass with a 45-row fixture.
- **Backend:**
  - G-3 (names of deleted lookups): show "(deleted)" until the backend returns names; then show the real name.
  - G-5 (envelope spend): the Spent column shows "—" until spend is available.
  - G-6 (recurring months running): the # chip shows "Month —" until the count exists.
  - G-2 (plan size on expenses): `n/N` comes from T-15's per-plan reads for now.

#### T-21 Sortable columns (M-06)
- **Includes:** every header becomes a sort button (reuse `SortableHeader`), three-state cycle, `aria-sort`, choice remembered on this device.
- **Done when:** the M-06 acceptance criteria pass.

#### T-22 Phone layout (M-05, M-04)
- **Includes:**
  - below `lg`, the table becomes the list from the phone frame: checkbox, item, type chip, "Due / Paid / Overdue" line, and the amount on the right;
  - the Balance card holds Income and Expenses;
  - the envelope strip scrolls sideways;
  - the floating add button;
  - no sorting on the phone.
- **Done when:** nothing scrolls horizontally at 390px except the envelope strip, and the layout matches the Mobile 390 frames.

### Phase 3 — Panels

#### T-23 Income panel, read (M-07)
- **Includes:** a side sheet on desktop and a bottom sheet on the phone, opened from the Income card or the phone's Income figure; total and "of this is salary"; the list with Salary badges and received dates; "No salary this month"; closes on X, Escape or the dimmed page. Add, edit and delete buttons are present but wired in T-32.
- **Done when:** the M-07 acceptance criteria pass.

#### T-24 Row details panel, read (M-08)
- **Includes:** the panel for expenses and envelopes:
  - type chip, title, category, amount and status pill;
  - Payment, Dates and Recurring bill sections;
  - for installments, the plan section (`n of N`, interval, first purchase, end date, View plan);
  - the selected row highlighted;
  - actions hidden in past months.
  Action buttons are wired in T-25, T-29, T-30 and T-31.
- **Done when:** the M-08 acceptance criteria pass and the panel matches the "Expense details open" frame.
- **Backend:**
  - G-3 (names of deleted lookups): Payment type, Bank and Store show "(deleted)" when the lookup is gone.
  - G-6 (recurring months running): "Months running" shows "—".
  - G-5 (envelope spend): envelope details show "—" for spent.

### Phase 4 — Actions

#### T-25 Mark paid / unpaid (M-12)
- **Includes:** the row checkbox and the details panel's "Mark as paid today"; `PATCH /expenses/:id` with `paidAt` today or `null`; an optimistic update with rollback and the error toast.
- **Done when:** the M-12 acceptance criteria pass, including the failure case.
- **Backend:** BE-3 (paid date on past months). The paid control stays hidden in past months. If the backend allows `paidAt` alone on past-month expenses, show it there too (the rest of the row stays locked).

#### T-26 Expense form: shared fields and one-time (M-14, M-26)
- **Includes:**
  - **+ Add** menu: Expense, Income, Envelope;
  - form shell: a dialog on desktop, a full-height sheet on the phone, react-hook-form + Zod;
  - type choice;
  - shared fields: Description, Category, Payment type, Bank (required when the payment type has a statement), Store;
  - one-time fields: Amount, Purchased, Due, Paid;
  - shared money validation: positive, 2 decimals, at most 99,999,999.99;
  - remembered payment type, bank and category (M-26).
- **Done when:** the M-14 and M-26 acceptance criteria pass, and backend errors use T-07's messages.

#### T-27 Expense form: installments (M-15)
- **Includes:** amount per payment, number of payments (at least 2), interval presets (30 / 14 / custom), first purchase date; the live plan preview; the toast saying which months received payments.
- **Done when:** the M-15 acceptance criteria pass.

#### T-28 Expense form: recurring (M-16)
- **Includes:** the explanatory note; `type: "recurring"`.
- **Done when:** the M-16 acceptance criteria pass.
- **Backend:** G-4 (recurring backfill). Confirm whether the backend also adds the bill to later months that are already open. If yes, invalidate those months' expenses after saving, and keep the note's wording; if no, change the note to say only months opened from now on get it.

#### T-29 Edit expense (M-17)
- **Includes:** the form prefilled, type locked, clearable Bank and Store; notes for installment and recurring rows; deleted lookups shown as "(deleted)"; only changed fields sent in the `PATCH`.
- **Done when:** the M-17 acceptance criteria pass.
- **Backend:** G-3 (names of deleted lookups). A deleted lookup on the row shows as "(deleted)" in its select until the backend returns names.

#### T-30 Delete expense (M-18)
- **Includes:** `ConfirmDeleteModal` with the three type-specific messages.
- **Done when:** the M-18 acceptance criteria pass.

#### T-31 Change an installment plan's amount (M-19)
- **Includes:** View plan; a Change amount field; the confirmation naming the current month; `PATCH /installment-groups/:id`; refresh of the months it affects.
- **Done when:** the M-19 acceptance criteria pass.

#### T-32 Add, edit, delete income (M-20, M-21)
- **Includes:** the income form (Description, Amount, Salary switch, Received date) from **+ Add** and the income panel; edit and delete from each income's menu.
- **Done when:** the M-20 and M-21 acceptance criteria pass.

#### T-33 Add and delete envelopes (M-23, M-24)
- **Includes:** **+ Add → Envelope**, offering only envelope categories without an envelope this month; delete from the envelope's details.
- **Blocked by a decision:** adding an envelope means typing its budget, while budgets are otherwise read-only (M-22). Confirm that M-23 and M-24 stay before starting.

#### T-34 Closed-month guard (M-25)
- **Includes:** any 422 shows "This month is now closed and can't be changed", refreshes the periods, and switches the screen to read-only.
- **Done when:** simulating a 422 on any mutation switches the screen to read-only.
- **Backend:**
  - G-1 (422 for expenses undocumented): confirm `PATCH` and `DELETE /expenses/:id` return 422 for past months, and ask for it to be added to `docs/APIs/expense.md`.
  - BE-3 (paid date on past months): if adopted, a `paidAt`-only change must not trigger the read-only switch.

### Phase 5 — Month lifecycle

#### T-35 Open a month (M-02, step 1–2)
- **Includes:** the Open button in the empty state and in the month list; `POST /budget-periods`; a 409 loads the existing month; only current and future months can be opened.
- **Done when:** opening December shows its generated rows.
- **Backend:** BE-1 (salary with the month). If adopted, the Open request also carries the salary from T-37.

#### T-36 Open-month review: bills, installments, envelopes (M-02, step 3)
- **Includes:** the review sheet after opening; recurring bills with editable amounts; installments with `n of N` and a "Last payment" tag; envelopes read-only; Done saves the changed amounts; closing without Done keeps the month as generated; Retry per failed section.
- **Done when:** the first, second and fourth M-02 acceptance criteria pass.

#### T-37 Open-month review: salary (M-02, step 3)
- **Includes:** "Copy last month's salary", listing last month's salary incomes with editable amounts and checkboxes, or a "Salary" field; one `POST /incomes` per income on Done.
- **Done when:** the third M-02 acceptance criterion passes.
- **Backend:** BE-1 (salary with the month). For now, one `POST /incomes` per salary after the month is created. If the backend accepts incomes in `POST /budget-periods`, collect the salary before opening and send it with that request (this also changes T-35).

#### T-38 Delete an empty month (M-03)
- **Includes:** Delete month in the header menu, disabled with a reason when the month isn't empty; a confirmation; landing on the previous opened month.
- **Done when:** the M-03 acceptance criteria pass.

### Phase 6 — Polish

#### T-39 Final pass
- **Includes:**
  - every frame of `design.pen` compared in light and dark, desktop and 390px;
  - keyboard paths: sort headers, checkboxes, panels with focus trap and Escape, the add menu;
  - contrast of dimmed rows;
  - unused translations and the old dashboard strings removed;
  - coverage thresholds raised if they went up.
- **Done when:** the checklist is complete and `check`, `build` and `test:cov` pass.

---

## 4. Waiting on the backend

These don't block any task, but each needs follow-up work once resolved (details in [todo.md](../specs/todo.md)). Each affected task also lists them in its own **Backend** line, with what to do now and what changes when the item lands.

| Item | Affects | What changes when it lands |
|---|---|---|
| G-5 envelope spend API | T-05, T-14, T-18, T-19, T-20, T-24 | Replace spend = 0 / "—" with real values; drop the "Envelope spend not included yet" note |
| G-6 recurring months running | T-20, T-24 | Replace "Month —" with the count |
| G-2 plan size on expenses | T-15, T-20, T-24 | Drop the per-plan requests |
| G-3 names of deleted lookups | T-20, T-24, T-29 | Replace "(deleted)" with the real name |
| G-4 recurring backfill | T-28 | Decide whether later opened months are refreshed after adding a recurring bill |
| BE-1 salary with the month | T-35, T-37 | Send the salary with `POST /budget-periods` |
| BE-3 paid date on past months | T-25, T-34 | Allow the paid control in past months |
| G-1 422 documented for expenses | T-34 | Confirm the guard covers expenses |

## 5. Open questions

| Question | Blocks |
|---|---|
| Do adding and deleting envelopes (M-23, M-24) stay, given budgets are read-only? | T-33 |
| Should envelope rows stay in the table, or live only in the Envelopes card? Kept for now, as in the design | T-20 |
