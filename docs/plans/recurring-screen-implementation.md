# Recurring Screen — Implementation Plan

Status: draft 1 · Last updated: 2026-11-26

Breaks the [Recurring screen spec](../specs/recurring-screen.md) into small tasks. Each task is one pull request to `development`, sized to be reviewed in one sitting. Task IDs start with **RC-** so they don't clash with the Month plan's T- numbers or the Management plan's ST- numbers.

Related: [Recurring spec](../specs/recurring-screen.md) · [Management plan](settings-screen-implementation.md) · [Month plan](month-screen-implementation.md) · [Backlog](../specs/todo.md) · [API docs](../APIs/recurring-expense.md) · [Design system](../../DESIGN_SYSTEM.md)

---

## 1. How to work through it

- **One task, one PR**, with a conventional commit title (`feat(recurring): …`). A task is done when its "Done when" checks pass and `npm run check`, `npm run build` and `npm run test:cov` are green.
- **Order:** phases run top to bottom. Inside a phase, tasks without a dependency can be done in parallel.
- **Verify the two open questions first (RC-00).** Q-1 (what `cancelledAt` means) and Q-2 (does a starting count refresh `monthsRunning`) change wording and cache rules. Ten minutes against the real API settles both before any code depends on them.
- **Ship read-only first.** Phases 0–2 give a Recurring screen that lists the real bills before any form exists. Actions come after.
- **Logic in `src/lib/`, UI in components.** Months running, status, sections, the cancel month options and the request builders are pure functions with tests, held to the 90% coverage bar. Components stay thin.
- **Reuse, don't rebuild.** The edit panel uses `DetailsSheet` and the field and toast conventions of `LookupFormPanel`; the delete uses `ConfirmDeleteModal`; errors go through `describeApiError`; the sections use `CollapsibleSection` and `use-persisted-boolean`; months come from `lib/month.ts`; money from `lib/money.ts`.
- **Every screen task** is checked in light and dark, on desktop and at 390px. `design.pen` has no Recurring frames, so compare with the Management and Month screens until frames exist.
- **Strings** go in `src/constants/translations.ts`; **colours** only through tokens.
- **Backend gaps stay inside the task they affect** (BE-2, G-16, Q-1, Q-2), each with what to do now and what changes when it is answered.

---

## 2. Task overview

| ID | Task | Phase | Spec | Depends on | Size | Backend |
|---|---|---|---|---|---|---|
| RC-00 | Verify Q-1 and Q-2 against the real API | 0 Foundations | R-05, R-06 | — | S | Q-1, Q-2 |
| RC-01 | Bill rows: status, months running, sections (`lib/recurring-rows.ts`) | 0 | R-01 to R-03 | — | M | G-16 |
| RC-02 | Bill form rules (`lib/recurring-form.ts`) | 0 | R-04 to R-06 | RC-00 | S | Q-1 |
| RC-03 | Recurring error messages (`lib/api-error-message.ts`) | 0 | R-05, R-06, R-08 | — | S | — |
| RC-04 | Recurring hooks: list, update, delete | 1 Data | R-01, R-05, R-06, R-08 | — | S | Q-2 |
| RC-05 | Recurring screen: list, sections and states | 2 Read-only screen | R-01 to R-03, R-10 | RC-01, RC-04 | M | G-16 |
| RC-06 | Edit panel | 3 Actions | R-04, R-05 | RC-02, RC-03, RC-05 | M | Q-2 |
| RC-07 | Cancel dialog | 3 | R-06 | RC-02, RC-03, RC-05 | M | Q-1 |
| RC-08 | Delete a bill | 3 | R-08 | RC-03, RC-05 | S | — |
| RC-09 | Add from the Recurring screen, starting count on the Month form | 4 Add | R-04, R-09 | RC-05 | M | — |
| RC-10 | Reactivate a bill | 5 Blocked | R-07 | RC-07 | S | BE-2 |
| RC-11 | Final pass: themes, 390px, accessibility, clean-up | 6 Polish | all except R-07 | RC-00 to RC-09 | S | — |

Size: **S** ≈ half a day, **M** ≈ a day.

---

## 3. Tasks

### Phase 0 — Foundations

#### RC-00 Verify the open questions against the real API
- **Status: done (2026-11-26).** Settled by reading the backend code (repository, service, `months-running.ts`) and confirmed against the live API with a throwaway bill, which was deleted afterwards along with everything it generated. Q-1 and Q-2 both match the spec, so no wording changes.
- **Goal:** settle Q-1 and Q-2 of the spec before RC-02, RC-06 and RC-07 depend on the answers.
- **Includes:** with a throwaway bill (delete it afterwards, and anything it generated):
  - **Q-1:** `PATCH` `cancelledAt` to the first day of the current month, open next month and check there is no row for the bill; set it to next month's first day on another bill and check that month does get its row. Also check that the date `PATCH` accepts is exactly "first day of the current UTC month" (the docs' boundary).
  - **Q-2:** `PATCH` `monthsAlreadyPaid` on a bill with an already-generated row, read the expense, and check its `monthsRunning` changed.
  - Write both results into spec section 6 (mark Q-1 and Q-2 resolved with the date, as G-14 was) and fix any wording the answers contradict.
- **Done when:** both questions are marked resolved or reworded in the spec, with the date and what was observed.
- **Backend:** this task *is* the check for **Q-1** and **Q-2**. If Q-1 differs (the bill disappears from its last month, or `cancelledAt` is exclusive), the dialog's select, the toast and the "Ends {Month}" badge switch to "first month without it", and RC-01's status rules and RC-02's builder change accordingly.

#### RC-01 Bill rows: status, months running, sections (`lib/recurring-rows.ts`)
- **Goal:** everything the list shows, as pure tested functions.
- **Includes:**
  - `billStatus(bill, now)` → `active | ending | cancelled | upcoming`, per the spec's definitions (UTC months);
  - `monthsRunning(bill, now)`: `monthsAlreadyPaid` plus the inclusive months from `startedAt` to the reference month (current month, or the last month for a cancelled bill), never below 1 plus the starting count;
  - `billRow(bill, lookups, now)`: the display model: description, amount, resolved category, payment type, bank and store names (`null` when absent, `deleted: true` when the id isn't in the loaded list, G-16), start month, months running, status, last month;
  - `splitBills(rows)` → `{ active, cancelled }` (active holds active, ending and upcoming), each sorted by description ignoring case.
- **Done when:** tests cover each status at the month boundaries (cancelled on the first day of the current month, the last day of the previous month, a December-to-January rollover), months running with and without a starting count, a bill started this month (Month 1, or the count plus 1), a cancelled bill (count stops), an empty store or bank, a deleted lookup, and the sort.
- **Backend:**
  - **G-16** (the resource has ids only and no `monthsRunning`): names come from the lookup lists and months running is computed here with the backend's definition. *To address when reached:* if the backend returns nested `{ id, name }` objects and `monthsRunning` on templates, drop the `lookups` argument and the computation, keep `deleted` from the nested object, and keep the tests as the contract.

#### RC-02 Bill form rules (`lib/recurring-form.ts`)
- **Goal:** the rules of the edit form and the cancel dialog in one tested module.
- **Includes:**
  - a Zod schema: description (trimmed, not empty), amount (the Month form's money rule, reuse it from `lib/expense-form.ts` or `lib/money.ts`, don't copy it), months already paid (whole number, 0 or more; an empty field means 0);
  - `billToFormValues` for the prefill, and `buildUpdateBillInput(bill, values)`: only changed fields, no change → `null` so the caller closes without a request;
  - `cancelMonthOptions(now, currentLast?)`: the current month and the next 11, as `{ month, value: "YYYY-MM-01", label }`. The API sets no upper limit on `cancelledAt`, so when an ending bill's current last month falls outside that range (for example December 2028 seen in November 2026) it is added as an extra option, in order, so the select can start on the stored value and nothing is shortened by accident. `buildCancelInput(month)` → `{ cancelledAt: "YYYY-MM-01" }`;
  - `currentLastMonth(bill)` to preselect a change of end month for an ending bill.
- **Done when:** tests cover trimming, the empty description, an amount with the wrong number of decimals, a negative or fractional starting count, only-changed-fields and the no-change case, the options across a year end, an existing last month beyond the 12 months (added once, in order) and one inside the range (not duplicated), and the cancel date format.
- **Backend:** **Q-1** (see RC-00): `buildCancelInput` and the option labels assume `cancelledAt` is the first day of the last month the bill appears in. Confirmed by RC-00: no change needed.

#### RC-03 Recurring error messages (`lib/api-error-message.ts`)
- **Goal:** map the backend's errors to the spec's messages with `describeApiError`, as ST-01 did for lookups.
- **Includes:** three contexts, `saveRecurring`, `cancelRecurring` and `deleteRecurring`:
  - `saveRecurring`: 404 → "This recurring bill no longer exists."; anything else → "Couldn't save the recurring bill. Try again.";
  - `cancelRecurring`: 404 → the same "no longer exists"; 400 and anything else → "Couldn't cancel the bill. Try again.";
  - `deleteRecurring`: 404 → counts as deleted (no error); anything else → "Couldn't delete the recurring bill. Try again.".
  Unmatched errors give the generic message, never the raw backend text.
- **Done when:** each row of the three error tables in the spec has a test.
- **Backend:** none.

### Phase 1 — Data hooks

#### RC-04 Recurring hooks: list, update, delete
- **Goal:** read the bills and change them, next to the single-bill read the Month screen already uses.
- **Includes:** in `src/hooks/use-recurring-expense.ts` (keep the file, it already owns `RECURRING_EXPENSES_QUERY_KEY`): `useRecurringExpenses()` (`GET recurring-expenses`, same 10-minute `staleTime` as the lookups, so a screen visit after a change on the Month screen still refetches because the mutations invalidate the key), `useUpdateRecurringExpense()` (takes `{ id, ...changedFields }`, used by edit and cancel) and `useDeleteRecurringExpense()`. Each invalidates `RECURRING_EXPENSES_QUERY_KEY`; an update that carries `monthsAlreadyPaid` also invalidates `EXPENSES_QUERY_KEY`. Add `UpdateRecurringExpenseInput` to `src/types/recurring-expense.ts`. Tests with `src/test/query-wrapper.tsx`.
- **Also:** a bill is created through the Month screen's `useCreateExpense` (`type: "recurring"`), which invalidates only `EXPENSES_QUERY_KEY`. Without more, the list's 10-minute `staleTime` would hide a bill created a minute ago. In `use-expenses.ts`, when the created expense is recurring, `useCreateExpense` also invalidates `RECURRING_EXPENSES_QUERY_KEY`. Deleting or editing a recurring *row* doesn't change the template, so those mutations stay as they are.
- **Done when:** each hook sends the expected request (`GET`, `PATCH` with only the given fields, `DELETE`), invalidates the list on success (and the expenses for a starting-count change), and leaves everything alone on error; `useCreateExpense` invalidates the bills only for a recurring create, not for one-time or installment ones.
- **Backend:** **Q-2**: whether the expenses need refreshing after a starting-count change depends on the backend computing `monthsRunning` live. Confirmed by RC-00: the backend computes it live, so keep the expenses invalidation.

### Phase 2 — Read-only Recurring screen

#### RC-05 Recurring screen: list, sections and states (R-01, R-02, R-03, R-10)
- **Goal:** `/recurring` shows the real bills, split into Active and Cancelled, with every state. No actions yet: the row menu has Edit, Cancel and Delete entries that do nothing until RC-06 to RC-08.
- **Includes:**
  - replace `ComingSoon` in `src/app/(app)/recurring/page.tsx` with `RecurringScreen` (`src/components/recurring/`); header with the heading, the count of active bills and the **Add recurring bill** button (does nothing until RC-09);
  - `BillList` used by both sections: a table on desktop (Description, Amount, Category, Payment type with the bank under it, Store, Starts, Months running, menu) and cards on the phone, built from `billRow`, with an "Ends {Month}" badge (`badge.tsx`) for ending bills and "(deleted)" cells;
  - the **Cancelled** section collapsed by default, remembered with `use-persisted-boolean`, hidden when empty;
  - skeleton rows while the bills or the four lookup lists load (names in skeleton until the lists arrive); an inline error with **Retry** when the bills fail to load; the empty state "No recurring bills yet. Add one from the Month screen" with the Add button;
  - the row menu with a 44px touch target on the phone, as in `LookupList`; the focus rules of the lookup row menu (the menu hands its button back so focus returns there).
- **Done when:** the R-01 to R-03 acceptance criteria pass with real data: Rent shows its Month n, a cancelled bill sits under Cancelled with its count stopped, an ending bill shows "Ends December" under Active, a deleted store reads "(deleted)". Light and dark at 390px, nothing scrolling sideways.
- **Backend:** **G-16**: the list makes five requests (bills plus the four lookups), all but the first already cached from the Month screen. *To address when reached:* if the backend nests names on templates, drop the lookup hooks from this screen.

### Phase 3 — Actions

#### RC-06 Edit panel (R-04, R-05)
- **Goal:** change a bill's description, amount and starting count.
- **Includes:**
  - `BillFormPanel` on `DetailsSheet`, opened from the row menu, titled "Edit {description}", prefilled with `billToFormValues`; fields Description\*, Amount\* and Months already paid with their hints; the note "Changes apply to months you open from now on…"; the read-only category, payment type, bank, store and start month above the fields with the "cancel and add a new one" line;
  - only changed fields are sent, no change closes without a request, success closes the panel and toasts "{Description} saved";
  - a 404 shows "This recurring bill no longer exists.", closes the panel and refreshes the list; other failures show the generic toast and keep the form open with what was typed;
  - one panel at a time; the panel closes if its bill leaves the list.
- **Done when:** the R-05 acceptance criteria pass: Hydro 105.00 → 112.40 updates the list, leaves the open month's row alone and opens the next month at 112.40; saving unchanged sends no request; the starting count changes the Month n here and on the Month screen's row.
- **Backend:** **Q-2**: the "Month n changes on existing rows" rule was confirmed by RC-00.

#### RC-07 Cancel dialog (R-06)
- **Goal:** stop a bill from a chosen month.
- **Includes:** `CancelBillDialog` (`EditModal` or the app's dialog shell): the select **Last month it appears in** from `cancelMonthOptions`, defaulting to the current month (or the current last month for an ending bill, where the menu entry reads **Change end month**), the explanation under it, **Keep bill** and **Cancel bill** (destructive style); one `PATCH` per confirm with the pending spinner; success closes the dialog and toasts "{Description} will end after {Month}" (or "{Description} cancelled" for the current month); a 404 and other failures as in the spec; the entry is hidden on a cancelled bill. If the month rolls over while the dialog is open, the options are rebuilt on a 400.
- **Done when:** the R-06 acceptance criteria pass against the real API: cancelling for the current month leaves this month's row and gives next month none; a bill ending in December reopens its dialog on December; the already-open month keeps its row and the dialog says so. Test bills removed afterwards.
- **Backend:** **Q-1**: the wording, the options and the badge all match what RC-00 confirmed. **BE-2**: until reactivation exists there is no "Keep running" choice and no way back (RC-10).

#### RC-08 Delete a bill (R-08)
- **Goal:** remove a bill.
- **Includes:** **Delete** in the row menu opens `ConfirmDeleteModal` ("Are you sure you want to delete the recurring bill {description}?" plus the explanation that generated rows stay); one `DELETE` per confirm with the pending spinner; success removes the row and toasts "{Description} deleted"; 404 counts as deleted; other failures show the generic toast and keep the row; focus goes to the list when the row's button is gone (as ST-09).
- **Done when:** the R-08 acceptance criteria pass against the real API: Netflix leaves the list and the months that had a Netflix row still have it. The test bill and its rows are removed afterwards.
- **Backend:** none.

### Phase 4 — Add

#### RC-09 Add from the Recurring screen, starting count on the Month form (R-04, R-09)
- **Goal:** the Add button works, and the starting count can be set when a bill is created.
- **Includes:**
  - the Add button links to `/month?add=recurring`; the Month screen reads `add=recurring` (`use-month-page.ts`), opens `ExpenseFormPanel` on the **Recurring** type for the current month and removes the parameter once the form is open (replace, no history entry); if the month isn't opened, the parameter is dropped and the usual "Open {Month}" state shows;
  - **Months already paid** field in the recurring part of `ExpenseFormPanel` (the type `CreateRecurringExpenseInput` already has `monthsAlreadyPaid?`), whole number, 0 or more, with the hint from the edit form, sent only when above 0; the form's translations get the field;
  - **Q-3**: `ExpenseDetailsPanel` hides "Edit the bill on the Recurring screen" when `useRecurringExpense` answers 404 for the row's bill (the bill was deleted); the form's matching edit note too.
- **Done when:** the R-09 acceptance criteria pass: Add recurring bill opens the Month screen on Recurring in the current month; a bill created with 10 already paid reads Month 11 in its first month and shows on the Recurring screen; the `add` parameter is gone after the form opens and a refresh doesn't reopen it; a deleted bill's rows no longer offer the link.
- **Backend:** none. `POST /expenses` already accepts `monthsAlreadyPaid` for recurring ([expense.md](../APIs/expense.md)).

### Phase 5 — Blocked

#### RC-10 Reactivate a bill (R-07)
- **Status: blocked on BE-2.** Don't start until the backend accepts `cancelledAt: null` (or adds a reactivate action).
- **Includes:** **Reactivate** in the row menu of ending and cancelled bills (with the same keyboard, focus-return and light, dark and 390px checks as RC-11, since RC-11 doesn't cover it), a confirmation ("{Description} will be added to the months you open from now on. Months already open aren't changed."), `cancelledAt: null`, a toast "{Description} reactivated"; the bill moves to Active. Error messages for a 404 and the generic failure as in RC-03. Align the spec, the software specification and `docs/APIs/recurring-expense.md`.
- **Done when:** a cancelled bill comes back, shows under Active, and the next opened month includes it.
- **Backend:** **BE-2** (see [todo.md](../specs/todo.md) §2.4). *To address when reached:* check whether months opened between the cancellation and the reactivation get rows (they shouldn't: only months opened after).

### Phase 6 — Polish

#### RC-11 Final pass
- **Includes:**
  - keyboard paths: the row menu, the edit panel with focus trap, Escape and focus return, the cancel dialog and its select, the delete modal, the collapsible Cancelled section;
  - the empty, loading and error states in light and dark at 390px, with nothing scrolling sideways;
  - unused translations removed;
  - the docs brought up to date: mark built tasks in this plan, resolve Q-1 to Q-3 in the spec, and align `docs/APIs/recurring-expense.md` and the UX brief §13 (the "Coming soon" field is live);
  - coverage thresholds in `vitest.config.ts` raised to the new floor (they only go up).
- **Done when:** `npm run check`, `npm run build` and `npm run test:cov` are green, and every spec acceptance criterion except reactivation (R-07, RC-10) has been checked in the browser against the real API. RC-11 doesn't wait for BE-2; when RC-10 is built it adds its own row-menu keyboard check and light, dark and 390px check.
- **Backend:** none.

---

## 4. Open questions carried into the work

| ID | Question | Settled in |
|---|---|---|
| Q-1 | What `cancelledAt` means for the last month | RC-00 (resolved) |
| Q-2 | Does a starting-count change refresh `monthsRunning` on existing rows | RC-00 (resolved) |
| Q-3 | Hide the Month screen's link to a deleted bill | RC-09 |
| BE-2 | Reactivate | RC-10, waits on the backend |
| G-16 | Names and `monthsRunning` on templates | Optional clean-up in RC-01 and RC-05 when the backend delivers |
