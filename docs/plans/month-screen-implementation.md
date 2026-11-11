# Month Screen — Implementation Plan

Status: draft 5 (past months editable, except envelopes) · Last updated: 2026-11-10

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
| T-02 | API client: JSON-paged lists | 0 | §5 | T-01 | S | — |
| T-03 | Month maths (`lib/month.ts`) | 0 | M-01, M-25 | — | S | — |
| T-04 | Money formatting (`lib/money.ts`) | 0 | §2 | — | S | — |
| T-05 | Row model, totals and status (`lib/month-rows.ts`) | 0 | §2, M-05, M-09, M-13 | T-01 | M | — |
| T-06 | Sort params for the expenses API (`lib/expense-sort.ts`) | 0 | M-06 | T-01 | S | — |
| T-07 | API error messages (`lib/api-error-message.ts`) | 0 | §4 | T-02 | S | — |
| T-08 | UI primitives: Card, Badge, Checkbox, Progress, Skeleton | 0 | — | — | M | — |
| T-09 | Navigation: Month, Recurring, Settings | 0 | A-01, A-02 | — | S | — |
| T-10 | Lookup hooks (categories, payment types, banks, stores) | 1 Data | §5 | T-02 | S | — |
| T-11 | Budget period hooks | 1 | M-01 | T-02 | S | — |
| T-12 | Expense hooks (paged, sorted list) | 1 | M-05, M-06 | T-02, T-06 | M | — |
| T-13 | Income hooks | 1 | M-07 | T-02 | S | — |
| T-14 | Envelope hooks | 1 | M-04 | T-02 | S | — |
| T-15 | Installment group hooks | 1 | M-19 | T-02 | S | — |
| T-16 | Month route and month switcher | 2 Read-only screen | M-01 | T-03, T-11 | M | — |
| T-17 | Month states: loading, error, not opened, not tracked, past | 2 | M-01, M-02, M-25 | T-16 | S | — |
| T-18 | Summary cards | 2 | M-04 | T-05, T-08, T-12–T-14 | S | — |
| T-19 | Envelopes card (collapsible) | 2 | M-04, M-11 | T-05, T-08, T-14 | M | G-12 |
| T-20 | Month table and pagination (desktop) | 2 | M-05, M-09, M-10, M-13 | T-05, T-08, T-12 | L | — |
| T-21 | Sortable columns | 2 | M-06 | T-06, T-20 | S | — |
| T-22 | Phone layout: list, pagination, envelope strip, add button | 2 | M-05, M-04 | T-18–T-20 | M | — |
| T-23 | Income panel (read) | 3 Panels | M-07 | T-13, T-18 | M | — |
| T-24 | Row details panel (read) | 3 | M-08 | T-20 | M | G-12 |
| T-25 | Mark paid / unpaid | 4 Actions | M-12 | T-12, T-20, T-24 | S | — |
| T-26 | Expense form: shared fields and one-time | 4 | M-14, M-26 | T-07, T-10, T-12 | L | — |
| T-27 | Expense form: installments | 4 | M-15 | T-26 | M | — |
| T-28 | Expense form: recurring | 4 | M-16 | T-26 | S | G-4 |
| T-29 | Edit expense | 4 | M-17 | T-26 | M | — |
| T-30 | Delete expense | 4 | M-18 | T-12, T-24 | S | — |
| T-31 | Change an installment plan's amount | 4 | M-19 | T-15, T-24 | S | — |
| T-32 | Add, edit, delete income | 4 | M-20, M-21 | T-13, T-23 | M | — |
| T-33 | Add and delete envelopes | 4 | M-23, M-24 | T-14, T-19 | S | — |
| T-34 | Past-month envelope guard (422 → message) | 4 | M-25 | T-07, T-17 | S | — |
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

#### T-02 API client: JSON-paged lists
- **Goal:** read `GET /expenses`, which returns `{ data, total, totalAmount, page, limit }` in the body. `getWithHeaders` expects an `x-total-count` header instead, so it doesn't fit.
- **Includes:** a typed `getPage<T>(endpoint, { page, limit, sortBy, sortOrder })` in `src/lib/api.ts` returning the body as is, including `totalAmount`.
- **Done when:** unit tests cover a page, the last page, an empty list and the query params.

#### T-03 Month maths (`lib/month.ts`)
- **Goal:** every month decision in one tested module, in **UTC** (spec §2).
- **Includes:** `currentMonth()`, parse/format `?period=YYYY-MM`, `prevMonth` / `nextMonth` with the upper limit (December of next year), `compareMonth` → past / current / future, `monthLabel` ("November 2026"), `findPeriod(periods, month)`.
- **Done when:** tests cover year boundaries, the upper limit, invalid `period` values (falling back to the current month) and the UTC edge at month end.

#### T-04 Money formatting (`lib/money.ts`)
- **Goal:** one formatter for every amount on screen.
- **Includes:** `formatCad(value, { sign })` → `CAD 1,450.00`, `+ CAD 6,144.00`, `- CAD 120.00` (negative balance only), plus the bare form used on the phone (`1,450.00`).
- **Done when:** tests cover thousands, rounding to 2 decimals, zero and negatives.

#### T-05 Row model, totals and status (`lib/month-rows.ts`)
- **Goal:** turn API data into what the screen shows. Detailed plan: [t-05-month-rows.md](t-05-month-rows.md).
- **Includes:**
  - `rowType(expense)` → one-time / installment / recurring. Envelopes are not table rows.
  - `buildRows(pageExpenses, now)` for **one page**, keeping the API's order (newest first, or the server sort). Names, plan size and months running come with each expense, so it needs no lookups.
  - `isUnpaid`, `isOverdue(expense, now)` (unpaid and due before today, any month).
  - `totals({ expenseTotal, envelopes, incomes })` → income, expenses (**`totalAmount` + envelope `spentAmount`**, a `null` spend counts as 0), balance, salary base, and whether every envelope's spend was available.
  - `envelopeStatus` (spent, allocated, ratio, over budget) and `sortEnvelopes` (over budget first).
  - `installmentEndDate(plan)` = first purchase + (N − 1) × interval days.
- **Done when:** tests reproduce the spec examples (Expenses 6,530.48 and Balance 845.19, Hydro overdue on 2026-11-15, Car finance 78 and 79 in one month).
- **Backend:** Q-3 pending (see [t-05-backend-requirements.md](../specs/t-05-backend-requirements.md)): if the external spend already includes expenses recorded in envelope categories, the same money is counted in both `totalAmount` and the envelope spend. Until it is answered, `totals` follows spec §2 (expense total + envelope spend); if the answer is yes, `totals` must exclude the overlap. `totals` takes the month's expense total from `totalAmount` (T-02), not from the page on screen.

#### T-06 Sort params for the expenses API (`lib/expense-sort.ts`)
- **Goal:** turn a header click into the `sortBy` / `sortOrder` params `GET /expenses` accepts, with the three-state cycle (ascending, descending, default). Detailed plan: [t-06-expense-sort.md](t-06-expense-sort.md); backend changes: [t-06-backend-requirements.md](../specs/t-06-backend-requirements.md).
- **Includes:** the mapping from M-06 (Item → `description`, Due → `dueAt`, Paid → `paidAt`, Amount → `amount`; default `createdAt` desc), the next-state function, and reading/writing the sort in the address. Sorting is **never** done in the browser on a single page.
- **Done when:** tests cover the four columns, the default and the reset on the third click.
- **Backend:** BE-4 (category and payment type sorting) is delivered; `categoryName` and `paymentTypeName` are in the mapping. The # column is never sortable.

#### T-07 API error messages (`lib/api-error-message.ts`)
- **Goal:** map backend errors to the messages in spec §4.
- **Includes:** 409 (month exists, month not empty, envelope exists), 400 (bank required, no period for installments), 404 (lookup gone), 422 (month closed), network / 500. Builds on `get-error-message.ts`.
- **Done when:** each row of the spec's §4 table has a test.
- **Status: done (2026-11-04).** `describeApiError(error, context)` takes what the user was doing (`openMonth`, `deleteMonth`, `createEnvelope`, `saveExpense`, `mutate`), because 409 and 404 mean different things per action. It returns `{ kind, message, field? }`; `getApiErrorMessage` returns the message and `isMonthClosedError` serves T-34. Unmatched errors give the generic message, never the raw backend text. The two 400s are matched on the backend's message text.

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
- **Status: done (2026-11-04).** `useCategories`, `usePaymentTypes`, `useBanks` and `useStores` each export their query key (`CATEGORIES_QUERY_KEY`, …) for the future mutations to invalidate. The cache time is `LOOKUP_STALE_TIME_MS` (10 minutes) in `src/lib/constants.ts`.

#### T-11 Budget period hooks
- `use-budget-periods.ts`: `useBudgetPeriods`, `useCreateBudgetPeriod`, `useDeleteBudgetPeriod`.
- **Status: done (2026-11-04).** Exports `BUDGET_PERIODS_QUERY_KEY`; both mutations invalidate it. The list is a plain array (no pagination), read with `api.get`. Creating or deleting a month doesn't touch expense or envelope queries, because those are keyed by period id.

#### T-12 Expense hooks
- `use-expenses.ts`:
  - `useMonthExpensesPage(periodId, page, sort)`: one page of 10 (`getPage`, T-02) with the sort params from T-06 in the query key, keeping the previous page visible while the next loads (`placeholderData`). Built like `usePagedList`, adapted to the API's `{ data, total, totalAmount, page, limit }` body. Exposes `totalAmount` for the summary cards.
  - `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`, invalidating the month's expense pages.
- `useUpdateExpense` supports an **optimistic** update, used by mark paid (T-25).
- **Status: done (2026-11-04).** `useUpdateExpense({ optimistic: true })` patches description, amount and dates in every cached page and restores them on error; lookup changes wait for the server. All expense queries share the `["expenses"]` key, so any mutation refreshes every month and page it may touch.

#### T-13 Income hooks
- `use-incomes.ts`: `useMonthIncomes(periodId)`, `useCreateIncome`, `useUpdateIncome`, `useDeleteIncome`.
- **Status: done (2026-11-04).** Exports `INCOMES_QUERY_KEY`; a month's list is keyed `["incomes", "month", periodId]` and waits until the period id is known. All three mutations invalidate every income query. `useUpdateIncome` takes `{ id, ...fields }` and sends only the fields given (`receivedAt: null` clears the date).

#### T-14 Envelope hooks
- `use-budget-envelopes.ts`: `useMonthEnvelopes(periodId)`, `useCreateEnvelope`, `useDeleteEnvelope`. No update hook (M-22).
- Spend comes with each envelope (`spentAmount`, `null` when the spend service is down), so no extra hook. `GET` is cached for 60 s in the backend for the current and future months; the hook refetches on window focus and invalidates after create and delete.
- **Status: done (2026-11-04).** Exports `BUDGET_ENVELOPES_QUERY_KEY`; a month's list is keyed `["budget-envelopes", "month", periodId]` and waits until the period id is known. `spentAmount` is passed through untouched, `null` included. Create and delete invalidate every envelope query.

#### T-15 Installment group hooks
- `use-installment-groups.ts`: `useInstallmentGroup(id)` (for the amount per payment, which `expense.installment` doesn't carry; unused since View plan was dropped from T-24, kept for T-31) and `useUpdateInstallmentGroup` (invalidates the expenses of every month it touches). `n of N`, interval and first purchase date come with each expense, so there are no per-plan reads.
- **Status: done (2026-11-04).** `useInstallmentGroup(id)` stays idle while `id` is `undefined`, so a caller can pass the id only when it needs the plan. `useUpdateInstallmentGroup` takes `{ id, amountPerInstallment }` and invalidates the plan and the root `["expenses"]` key, which covers every month and page. The key is a local copy until the expense hooks are merged; switch it to `EXPENSES_QUERY_KEY` then.

### Phase 2 — Read-only Month screen

#### T-16 Month route and month switcher (M-01)
- **Includes:** `src/app/(app)/month/page.tsx`; the selected month read from and written to `?period=`; the header with the previous and next arrows; the month name opening a list of opened months grouped by year; a header menu (⋯) placeholder.
- **Done when:** the three M-01 acceptance criteria pass, and the back button returns to the previous month.

#### T-17 Month states (M-01, M-02, M-25)
- **Includes:** skeletons while loading; an inline error with Retry; "{Month} hasn't been opened yet" with an Open button (wired up in T-35); "{Month} wasn't tracked in the app" for past months never opened; a quiet "Past month" pill for opened past months (it replaced the Closed banner on 2026-11-10), and `useMonthAccess()` returning `canEdit` (expenses and incomes: open and past months) and `canEditEnvelopes` (current and future months only, because the backend answers 422 for envelopes of past periods). The state is called `past`, not `closed`.
- **Done when:** each state matches its `design.pen` frame (Not opened, Past month).

#### T-18 Summary cards (M-04)
- **Includes:** Income (with View all, wired in T-23), Expenses and Balance, in that order; totals from T-05, using `totalAmount` from T-12, so they don't depend on the page on screen.
- **Done when:** the M-04 acceptance criteria pass.
- No note on the Expenses card when envelope spend is missing (dropped 2026-11-05); a `null` spend counts as 0. Amounts show "$" with 30px values, as in `design.pen`.
- **Status: done (2026-11-05).** `useMonthSummary(periodId)` combines page 1 of the expenses (`totalAmount`), the incomes and the envelopes into `totals`; `SummaryCards` renders for open and closed months. The Income card shows no `+` sign. The phone layout (Balance holding Income and Expenses) is T-22.

#### T-19 Envelopes card (M-04, M-11)
- **Includes:** a 4-column grid with name, spent / allocated and a bar; over-budget first and in the danger colour; the "{n} over budget" pill; Hide / Show remembered in `localStorage` (wrapped in try/catch); spend placeholder "—" until the API exists; clicking an envelope opens its details (wired in T-24).
- **Done when:** it matches the expanded and collapsed `design.pen` frames, and the over-budget pill stays visible when collapsed.
- **Backend:** G-12 (envelopes carry no category name). Names come from the categories lookup (T-10); a category deleted after the envelope's month shows "(deleted)" until the backend returns `category: { id, name }`.
- An envelope with unavailable spend shows "—" and no bar, and can't count as over budget.

#### T-20 Month table and pagination, desktop (M-05, M-09, M-10, M-13)
- **Includes:**
  - columns #, Item, Category, Payment, Due, Paid, Amount, plus a row menu; no envelope rows and no Spent column;
  - the type chip: `n/N` for installments, "Month 11" (`monthsRunning`) for recurring rows;
  - left-aligned cells and no total row;
  - paid rows dimmed, with the checkbox at full strength (read-only until T-25);
  - overdue due dates in red with the alert icon and a screen-reader label;
  - the real names of lookups, even deleted ones (they come with the expense);
  - the empty state "No expenses yet";
  - **pagination** with the existing `Pagination` component (a footer inside the table card with the count and numbered pages; with a single page only the count remains); the page kept in the address (`&page=2`); back to page 1 on month change and after adding an expense; the previous page shown when the last one empties;
  - clicking a row selects it (the details panel opens in T-24).
- **Done when:** the M-05 acceptance criteria pass with a 45-expense fixture (pages of 10, 10, 10, 10 and 5).

#### T-21 Sortable columns (M-06)
- **Includes:** Item, Category, Payment, Due, Paid and Amount headers become sort buttons (reuse `SortableHeader`), three-state cycle, `aria-sort`, sort sent to the server via T-06 and T-12, back to page 1 on change, kept in the address and remembered on this device. # is never sortable and stays a plain label.
- **Done when:** the M-06 acceptance criteria pass.
- **Backend:** BE-4 (category and payment type sorting) is delivered, so Category and Payment are sortable too. # stays a plain label.
- **Status: done (2026-11-09).** `useMonthSort` reads the sort from the address, then the device (`month-sort` in `localStorage`), then the default. A click writes both and goes to page 1 in one navigation; the third click clears the remembered sort. Changing month drops `page` and the sort params from the address, and the remembered sort applies again. The phone list has no sort.

#### T-22 Phone layout (M-05, M-04)
- **Includes:**
  - below `lg`, the table becomes the list from the phone frame: checkbox, item, type chip, "Due / Paid / Overdue" line, and the amount on the right;
  - the pagination footer under the list inside the card;
  - the Balance card holds Income and Expenses;
  - the envelope strip scrolls sideways and keeps the Hide / Show toggle of T-19 (done; spec M-04 updated 2026-11-09);
  - the floating add button: phone only, hidden only while the month isn't editable (`canEdit`, which past months now satisfy), above the bottom tab bar, 44px touch target; it does nothing until the + Add menu arrives in T-26 (`onAdd?` prop);
  - no sorting on the phone.
- **Done when:** nothing scrolls horizontally at 390px except the envelope strip, and the layout matches the Mobile 390 frames.
- **Status: done (2026-11-09).** Most of the phone layout already came with T-18 to T-20; this task added the floating add button (`AddFab`, shown by `MonthScreen` on the phone when `canEdit`). It can be dragged anywhere and settles against the closest side (left or right) when let go, never over the bottom tab bar; the arrow keys switch sides or move it up and down; it remembers its spot on the device; it does nothing until the + Add menu (T-26). Manual QA at 390px is done by the owner.

### Phase 3 — Panels

#### T-23 Income panel, read (M-07)
- **Includes:** a side sheet on desktop and a bottom sheet on the phone, opened from the Income card or the phone's Income figure; total and "of this is salary"; the list with Salary badges and received dates; "No salary this month"; closes on X, Escape or the dimmed page. Add, edit and delete buttons are present but wired in T-32.
- **Done when:** the M-07 acceptance criteria pass.
- **Status: done (2026-11-09).** `IncomePanel` is opened from the Income card and the phone's Income figure; it is a 440px right sheet on desktop and a bottom sheet on the phone. Incomes are sorted salary first, then by received date (undated last) in `lib/month-incomes.ts`. The panel reads the summary's cached incomes, so opening it adds no request. Focus lands on the panel and returns to the opener on close. Add, Edit and Delete take optional handlers and do nothing until T-32; they show in every opened month, past ones included (since 2026-11-10).

#### T-24 Row details panel, read (M-08)
- **Includes:** the panel for expenses and envelopes:
  - type chip, title, category, amount and status pill;
  - Payment, Dates and Recurring bill sections;
  - for installments, the plan section (`n of N`, interval, first purchase, end date); no View plan button (dropped 2026-11-09, the section has all the details needed); the plan's amount per payment is not on the expense and is not shown;
  - the selected row highlighted;
  - actions hidden in past months only for envelopes (`canEditEnvelopes`); expense actions work in every opened month.
  Action buttons are wired in T-25, T-29 and T-30.
- **Done when:** the M-08 acceptance criteria pass and the panel matches the "Expense details open" frame.
- **Backend:** G-12 (envelopes carry no category name): an envelope whose category was deleted shows "(deleted)".
- Months running, plan interval and end date come from the expense; the panel never reads the installment group.
- **Status: done (2026-11-09).** The open expense or envelope is in the address (`?expense=<id>` or `?envelope=<id>`, `useLinkedSelection`, pure helpers in `lib/selection-link.ts`), so a link opens it and only one panel is open at a time. Opening adds a history entry and closing goes back to it (a pasted link just loses the param); changing month drops it. A link to a row on another month or page is read by id (`useExpense`, `useBudgetEnvelope`) and `useLinkedSelectionSync` switches the screen to that row's month; a missing or malformed id shows a toast and drops the param. Two arrows beside Close step to the previous and next expense of the page on screen (`link.show` replaces the address, so back still closes in one step). At the edge of a page they continue onto the neighbouring page (the panel reads that page only when standing on the edge, and sets `?page=` and `?expense=` together); a count (`(11/36)`) beside them shows the place in the month; they stop at the first and last expense of the month and don't apply to envelopes. Rows opened on screen are cached under their id, so no by-id request is made. `ExpenseDetailsPanel` and `EnvelopeDetailsPanel` (shared frame in `DetailsSheet`) read the page and envelopes already loaded; a recurring row also reads its bill (`useRecurringExpense`) for the month it started. The panel closes by itself if the expense leaves the page on screen. Action buttons (paid, Edit, Delete) take optional handlers and do nothing until T-25, T-29, T-30 and T-33; they show in every opened month, past ones included (since 2026-11-10). G-12: an envelope whose category is gone now shows "(deleted)" instead of being left out of the card.

### Phase 4 — Actions

#### T-25 Mark paid / unpaid (M-12)
- **Includes:** the row checkbox and the details panel's "Mark as paid today"; `PATCH /expenses/:id` with `paidAt` today or `null`; an optimistic update with rollback and the error toast.
- **Done when:** the M-12 acceptance criteria pass, including the failure case.
- **Backend:** none. Past-month expenses are fully editable (BE-3 resolved 2026-11-10), so the control works in every opened month.
- **Status: done (2026-11-10).** `MonthScreen` holds one `useUpdateExpense({ optimistic: true })` and passes `onTogglePaid` to the table, the phone list and the details panel. Ticking sends `paidAt` as today in UTC (`todayIso`), unticking sends `null`; the row stays in place. On failure the change rolls back and a toast says "Couldn't update the paid status. Try again." (every failure shows that text; expenses no longer return 422). Past months work the same way (updated 2026-11-10): the checkbox and the panel button are active whenever the month is opened.

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
- **Includes:** the form prefilled, type locked, clearable Bank and Store; notes for installment and recurring rows; deleted lookups kept selected with their name and a "(deleted)" mark (a lookup is deleted when its id is missing from the active list); only changed fields sent in the `PATCH`.
- **Done when:** the M-17 acceptance criteria pass.
- Prefill reads the ids from `expense.category.id`, `expense.paymentType.id`, `expense.bank?.id` and `expense.store?.id`; the request body still sends flat ids.

#### T-30 Delete expense (M-18)
- **Includes:** `ConfirmDeleteModal` with the three type-specific messages. Also available in past months.
- **Done when:** the M-18 acceptance criteria pass.

#### T-31 Change an installment plan's amount (M-19)
- **Blocked by a decision:** View plan was dropped from the row details (T-24), so M-19 has no entry point yet. Decide where Change amount lives (for example an action in the details' installment section) before starting.
- **Includes:** a Change amount field, opened from that entry point; the confirmation naming the current month; `PATCH /installment-groups/:id`; refresh of the months it affects. The backend changes only rows from the current month onward, so opened from a past month the confirmation says the change applies from this month onward and past rows keep their amount.
- **Done when:** the M-19 acceptance criteria pass.

#### T-32 Add, edit, delete income (M-20, M-21)
- **Includes:** the income form (Description, Amount, Salary switch, Received date) from **+ Add** and the income panel; edit and delete from each income's menu.
- **Done when:** the M-20 and M-21 acceptance criteria pass.

#### T-33 Add and delete envelopes (M-23, M-24)
- **Includes:** **+ Add → Envelope**, offering only envelope categories without an envelope this month; delete from the envelope's details.
- **Blocked by a decision:** U-2 in [todo.md](../specs/todo.md). Adding an envelope means entering its budget once (the one exception to M-22). Confirm that M-23 and M-24 stay before starting.
- **Past months:** + Add → Envelope and the envelope's Delete are hidden in past months (`canEditEnvelopes`, M-25).

#### T-34 Past-month envelope guard (M-25)
- **Includes:** a 422 on creating or deleting an envelope shows "Envelopes of past months can't be changed" (`errors.monthClosed`, `isMonthClosedError`) and refreshes the envelopes. It only happens when a month ends while the screen is open, since the screen already hides those actions in past months.
- **Done when:** simulating a 422 on an envelope mutation shows the message.
- Expenses and incomes no longer return 422, so the read-only switch this task used to cover is gone (2026-11-10).

### Phase 5 — Month lifecycle

#### T-35 Open a month (M-02, step 1–2)
- **Includes:** the Open button in the empty state and in the month list; `POST /budget-periods`; a 409 loads the existing month; only current and future months can be opened.
- **Done when:** opening December shows its generated rows.
- **Backend:** BE-1 (salary with the month). If adopted, the Open request also carries the salary from T-37.

#### T-36 Open-month review: bills, installments, envelopes (M-02, step 3)
- **Includes:** the review sheet after opening; recurring bills with editable amounts; installments with `n of N` and a "Last payment" tag; envelopes read-only; Done saves the changed amounts; closing without Done keeps the month as generated; Retry per failed section.
- **Done when:** the first, second and fourth M-02 acceptance criteria pass.

#### T-37 Open-month review: salary (M-02, step 3)
- **Includes:** "Copy last month's salary", listing last month's salary incomes with editable amounts and checkboxes, or a "Salary" field; one `POST /incomes` per income on Done. Before any retry, re-read the month's incomes and skip salaries that already exist with the same description and amount, so a lost response doesn't create a duplicate. If a salary still fails, the month stays usable and the review says which salary is missing (it can be added from the income panel).
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

Resolved on 2026-11-10: past-month expenses and incomes can be changed (BE-3, G-1). `docs/software_specification.md` line 141 still says an expense can't be updated in a past month and needs the same update.

Delivered on 2026-11-03 and no longer waited on: envelope spend (G-5), plan size on expenses (G-2), names of deleted lookups (G-3), recurring months running (G-6) and sorting by category and payment type name (BE-4).

| Item | Affects | What changes when it lands |
|---|---|---|
| G-12 category name on envelopes | T-19, T-24 | Replace "(deleted)" with the real category name |
| G-4 recurring backfill | T-28 | Decide whether later opened months are refreshed after adding a recurring bill |
| BE-1 salary with the month | T-35, T-37 | Send the salary with `POST /budget-periods` |

## 5. Open questions

| Question | Blocks |
|---|---|
| U-2: Do adding and deleting envelopes (M-23, M-24) stay, given budgets are read-only? | T-33 |
| U-3: Where does Change amount (M-19) live now that View plan is gone from the row details? | T-31 |
