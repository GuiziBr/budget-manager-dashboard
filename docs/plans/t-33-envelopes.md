# T-33 Add, edit and delete envelopes — Implementation Plan

Status: done (2026-11-16) · Last updated: 2026-11-16

Detail plan for T-33 of [month-screen-implementation.md](month-screen-implementation.md). One pull request: `feat(month): add, edit and delete envelopes`.

Related: [Month spec](../specs/month-screen.md) (M-22, M-23, M-24, M-25) · [Envelope API](../APIs/budget-envelope.md) · [Backlog](../specs/todo.md) (U-2)

---

## 1. Decision and scope

**Decision (U-2 closed, 2026-11-16):** envelopes can be **added, edited and deleted**. Editing changes **only the allocated amount (the budget)**; the category never changes.

This reverses M-22 ("budgets are read-only") and the "`PATCH /budget-envelopes/:id` is not used" notes. No backend change is needed: all three endpoints exist.

| Action | Endpoint | Body | Notes |
|---|---|---|---|
| Add | `POST /budget-envelopes` | `{ budgetPeriodId, categoryId, allocatedAmount }` | 409 already exists, 400 category has no envelope, 422 past month. Response carries spend. |
| Edit budget | `PATCH /budget-envelopes/:id` | `{ allocatedAmount }` | 400 on an empty body, 404 gone, 422 past month. **The response has no `spentAmount` / `spendUpdatedAt`.** |
| Delete | `DELETE /budget-envelopes/:id` | — | 204; 404 gone; 422 past month. |

**Entry points (confirmed):**
- **+ Add → Category** (desktop header menu and phone floating button) opens the form in add mode.
- The envelope **details panel** gets an **Edit budget** button beside **Delete**; it opens the same form in edit mode (Category read-only, Budget editable).
- **Delete** stays in the details panel, behind `ConfirmDeleteModal`.

**Past months:** all three actions are hidden when `canEditEnvelopes` is false (M-25). A 422 from a month that ended while the screen was open is handled by T-34; T-33 maps it with the existing `errors.monthClosed` text so the mutations don't need rework later.

**Out of scope:** envelope rows in the table (U-3), editing the category, the open-month review (T-36), G-12 (category name on envelopes, still shows "(deleted)").

---

## 2. Findings from the code

- `useCreateEnvelope` and `useDeleteEnvelope` exist in [use-budget-envelopes.ts](../../src/hooks/use-budget-envelopes.ts) and invalidate `["budget-envelopes"]`. There is **no update hook**; the file comment and the types file say "budgets are read-only".
- `CreateEnvelopeInput` exists; there is no `UpdateEnvelopeInput`. `BudgetEnvelope` is documented as never patched.
- `EnvelopeDetailsPanel` already takes `canEdit` and an optional `onDelete`, and renders the Delete button; there is no Edit button.
- `AddMenu` already has an `onAddEnvelope` entry and the "Envelope" label and hint in translations; `MonthScreen` does not pass it. Entries can't be disabled yet (needed for M-23 step 2).
- `describeApiError` already has the `createEnvelope` context (409 → "{category} already has an envelope this month") and maps every 422 to `errors.monthClosed`. T-33 adds `updateEnvelope` and `deleteEnvelope` contexts for update and delete.
- `Category.hasBudgetEnvelope` is in the type and the dev API (`/categories` returns Baby, Fuel, Grocery… with `true`).
- `IncomeFormPanel` is the template for the new form: `DetailsSheet` shell, react-hook-form + Zod, red border and no visible message, hidden reason for screen readers, `formatMoneyInput` / `checkMoney` / `parseMoney` from `lib/money`, a `key` per entity to remount, `onSavingChange` to block dismissal during a save, a toast on server error.
- Every envelope query shares the `["budget-envelopes"]` prefix, and the summary cards read the same list, so invalidating that key refreshes the card, the details panel, the totals and the by-id cache in one go.
- Gotcha: because the PATCH response has no spend, the cache must **not** be patched with it (the tile would lose its spent figure). Invalidate and refetch instead.

---

## 3. Work breakdown

Order matters: 3.1 to 3.3 are pure and testable first; the UI follows.

### 3.1 Types and hook
- `src/types/budget-envelope.ts`: add `UpdateEnvelopeInput { allocatedAmount: number }`, export it from `src/types/index`; update the doc comments that say the app never patches.
- `src/hooks/use-budget-envelopes.ts`: add `useUpdateEnvelope()` taking `{ id, allocatedAmount }`, `api.patch`, `onSuccess` invalidating `BUDGET_ENVELOPES_QUERY_KEY` (no optimistic update; see the gotcha). Update the comment above `useDeleteEnvelope`.
- Check `api.patch` exists in `src/lib/api.ts`; reuse what `useUpdateIncome` uses.
- Tests (`use-budget-envelopes.test.tsx`): PATCH URL and body, invalidation, error passed through.

### 3.2 Form logic (`src/lib/envelope-form.ts`)
- `EnvelopeFormValues { categoryId: string, amount: string }`, `EMPTY_ENVELOPE_FORM`.
- `envelopeFormSchema`: category required (add mode only), amount through `checkMoney` (above 0, 2 decimals, max 99,999,999.99), messages in translations.
- `buildCreateEnvelopeInput(values, periodId)` and `buildUpdateEnvelopeInput(values, envelope)`; the latter returns `null` when the amount is unchanged (closes without a request, like income).
- `envelopeToFormValues(envelope)` using `formatMoneyInput(String(Math.round(x * 100)))`.
- `availableEnvelopeCategories(categories, envelopes)`: `hasBudgetEnvelope` and no envelope this month, sorted by name. Returns `[]` when every category is used (drives the disabled entry).
- `envelopeDeleteMessage(categoryName)`: "Are you sure you want to delete the {category} envelope?" plus the effect line from M-24 ("Its spend leaves the month's totals.").
- Tests: schema edge cases, unchanged amount, the available-categories filter (the M-23 Fuel example), the delete message. Held to the 90% bar for `src/lib/`.

### 3.3 Error mapping (`lib/api-error-message.ts`)
- Add contexts `updateEnvelope` and `deleteEnvelope` (or reuse `mutate`); both map 422 to the existing month-closed message, 404 to `errors.envelopeGone` ("This envelope no longer exists." already exists as `envelopeNotFound` in details; reuse or move), everything else generic.
- `createEnvelope` already covers 409; add 400 "does not support budget envelopes" → generic is acceptable, because the form only offers eligible categories.
- Tests: one per new row of spec §4.

### 3.4 Envelope form panel (`src/components/month/EnvelopeFormPanel.tsx`)
- Built like `IncomeFormPanel` (same shell, `separated`, `fullHeight`, `titleAside` with the month, 14px labels, **Save** and **Cancel**, no "Finish & add another").
- **Add:** Category `SelectMenu` listing only `availableEnvelopeCategories`, placeholder "Select a category"; Budget with the `$` icon and `formatMoneyInput`. Initial focus on Category.
- **Edit:** title "Edit budget", Category shown as read-only text (a disabled input would hide it from screen readers), Budget prefilled and focused. The envelope's spend is shown as a hint under the field ("Spent so far: CAD 245.18") so the user sees what the new budget compares to; hidden when spend is `null`.
- Server errors: toast through `getApiErrorMessage` with `createEnvelope` / `updateEnvelope`; a 409 also leaves the panel open and refreshes the list so the category disappears from the options; fixed toast id to avoid stacking.
- Remounts per envelope with a `key`, blocks dismissal while saving, closes on success with a success toast ("{Category} envelope added to {month}." / "{Category} budget updated.").
- Tests (`EnvelopeFormPanel.test.tsx`): renders add and edit, only eligible categories offered, validation red border, create body, update body only when changed, no request on unchanged, 409 / 422 / generic toasts, saving blocks Escape.

### 3.5 Wire-up in `MonthScreen` and the panels
- `AddMenu`: allow an entry to be **disabled with a reason**. `onAddEnvelope` plus a new `envelopeDisabledReason?: string`; a disabled item shows the M-23 text "Every category already has a budget this month." in its hint line, is not focusable-to-run, and keeps `aria-disabled`. Same for `AddFabMenu`. Update `AddMenu.test.tsx` and `AddFab.test.tsx`.
- `MonthHeader` and the phone `AddFabMenu` receive `onAddEnvelope` only when `canEditEnvelopes`.
- `MonthScreen`: state `envelopeFormOpen` and `editingEnvelope`, an `openEnvelopeForm(opener, envelope?)` that follows the same "one panel at a time" rule (closes the income panel, the other forms and the open details), resets on month change, renders `<EnvelopeFormPanel open={envelopeFormOpen && canEditEnvelopes} …/>`.
- Edit opened from the details panel: the form replaces the details panel (as Edit does for expenses). On save the details panel for that envelope comes back, so the new budget and bar show at once (`link.show({ kind: "envelope", id })`), unless the month changed meanwhile (reuse the `monthKeyRef` guard from the income form).
- Delete: `deletingEnvelope` state and a `ConfirmDeleteModal` (title, message from 3.2), `useDeleteEnvelope`. Mirror the expense delete flow: hide the panel at once and clear `?envelope=`, restore it on failure, a 404 counts as already deleted (invalidate, no toast), other failures toast "Couldn't delete the envelope. Try again.", success toasts "{Category} envelope deleted".
- `EnvelopeDetailsPanel`: new `onEdit?(envelope)` prop and an **Edit budget** `outline` button above Delete, both inside the `canEdit` block, stacked full width. Update the comment ("Wired in T-33") and the intro comment ("budget is read-only").
- `EnvelopesCard`: empty state stays; when the month has no envelopes and the user can add one, no extra control is needed (the Add menu is the entry), but check the empty card text still makes sense.

### 3.6 Translations
`translations.month.envelopeForm` (titles, descriptions, labels, placeholders, hints, validation, success and failure toasts), `month.envelopes.delete*`, `month.addMenu.envelope.disabled`, `month.details.editBudget`. No hard-coded strings in components.

### 3.7 Docs (same PR)
- **month-screen.md:** replace M-22 with "Edit an envelope's budget" (only the budget; category fixed; hidden in past months; acceptance: *Given* the Grocery envelope of 600.00, *when* I change the budget to 700.00, *then* the card, the details and "remaining" show 700.00 and the spent figure is unchanged); rewrite M-23 (drop "can't be changed afterwards" and the pending-decision note); update M-24 (no change); update the summary table (row M-22 name and status), the "envelope budgets are read-only" line at ~L114, the 2026-10-30 decisions note (add a dated line for this reversal), and bump the status line.
- **todo.md:** mark U-2 resolved (2026-11-16) with the decision.
- **month-screen-implementation.md:** T-33 gets its Includes, Done when and Status; remove U-2 from the open questions (section 5) and from "Blocked by a decision"; bump the status header; adjust the T-14 note "No update hook (M-22)" and the types and hook comments' references.
- **design.pen:** if the pen tool is available, add "Month — Add envelope", "Month — Edit budget" (desktop and 390px, light and dark) and the new button in "Envelope details", copied from the income form frames. If it isn't available, record in T-33's Status that the frames are behind, as was done for T-26.

---

## 4. Definition of done

- Spec acceptance criteria pass: M-23 (Fuel offered after deleting Fuel, others not; the disabled entry when none are left), the new edit criterion, M-24 (Parking envelope deleted: gone from the card, balance rises by its spend), M-25 (no envelope controls in past months).
- `npm run check`, `npm run build` and `npm run test:cov` green, coverage thresholds not lowered.
- Browser QA in section 5 completed and noted in the Status line.

---

## 5. Functional and visual testing with Chrome DevTools

Run against the real backend (`NEXT_PUBLIC_API_URL`, dev API at `localhost:3002`) with `npm run dev`, using the Chrome DevTools MCP (`navigate_page`, `take_snapshot`, `click`, `fill`, `take_screenshot`, `resize_page` / `emulate`, `list_network_requests`, `list_console_messages`).

**Data rules (approved):** test in the **current month** only; note the envelopes and totals before starting; every test row created is deleted at the end, and any envelope deleted during the test is recreated with its original budget. Never touch a past month for writes.

### 5.1 Functional checks (each: snapshot, then the network and console)
| # | Scenario | Expect |
|---|---|---|
| F-1 | Open + Add on desktop | Entries Expense, Income, Category; Category shows its hint |
| F-2 | Category → category list | Only categories with `hasBudgetEnvelope` and no envelope this month |
| F-3 | Submit empty form | Red borders on Category and Budget, no message text on screen, focus on the first invalid field, no request |
| F-4 | Budget `0`, `1.234`, `100000000` | Rejected as in the income form; typing `10050` reads `100.50` |
| F-5 | Add a valid envelope | One `POST /budget-envelopes` with the expected body (201), panel closes, toast, tile appears in the card in the right order, Expenses and Balance update by the spend of that category |
| F-6 | Add every remaining eligible category (or run on a month where all are used) | The Category entry is disabled with the M-23 text |
| F-7 | Duplicate (create the same category in another tab, then submit) | 409 toast "{Category} already has an envelope this month.", list refreshed, category gone from the options |
| F-8 | Open an envelope, Edit budget | Form prefilled, category read-only, spent hint shown |
| F-9 | Save unchanged | Closes, **no** request |
| F-10 | Change the budget | One `PATCH` with only `{"allocatedAmount": …}` (200), the details panel returns with the new budget, remaining and bar updated, the tile too, **spent figure intact** (the PATCH response has none: confirm a follow-up `GET`) |
| F-11 | Lower the budget below the spend | Tile and panel turn over budget, "{n} over budget" pill appears (also with the card collapsed) |
| F-12 | Delete, Cancel | No request |
| F-13 | Delete, confirm | One `DELETE` (204), panel closes, `?envelope=` removed, tile gone, balance rises by the spend, toast |
| F-14 | Delete the same envelope twice (second tab) | 404 handled quietly, list refreshed |
| F-15 | Failure paths: block the request with DevTools or stop the API | Generic toast, form keeps what was typed, delete restores the panel |
| F-16 | Past month (switcher) | No Category entry in the Add menu or phone button, no Edit budget or Delete in the details; expense and income actions still present |
| F-17 | Month change while the form is open | Form closes, nothing saved to the wrong month |
| F-18 | Shared link `?envelope=<id>` then Edit budget | Works from a link; Back and Close behave as for the other panels |
| F-19 | Keyboard | Add menu by keys, focus lands in the first field, Tab order, Escape closes (not during a save), focus returns to the opener, the dimmed page is inert |
| F-20 | Console | No errors or warnings in any of the above |

### 5.2 Visual checks
Take screenshots of each state and compare with the income and expense form frames in `design.pen` (and the new frames if added): spacing, 20px title with the month beside it, 14px labels, red borders with no message rows, `$` icon, separator under the header, button stack.

| Surface | Light | Dark |
|---|---|---|
| Add menu with Envelope (desktop) | ✓ | ✓ |
| Add menu with the disabled Category entry | ✓ | ✓ |
| Add envelope form: empty, errors, filled (desktop) | ✓ | ✓ |
| Edit budget form (desktop) | ✓ | ✓ |
| Envelope details with Edit budget and Delete buttons | ✓ | ✓ |
| Delete confirmation modal | ✓ | ✓ |
| Card after add, after edit (over budget), after delete | ✓ | ✓ |
| Phone 390px: floating menu with Envelope, full-height form, details with both buttons | ✓ | ✓ |

For the phone use `emulate` / `resize_page` to 390 × 844 and check `document.documentElement.scrollWidth <= innerWidth` through `evaluate_script` (no horizontal scroll except the envelope strip). Also check the 44px touch target of the new buttons and `get_css_styles` on the button stack for tokens only (no raw colours).

### 5.3 Wrap-up
- Verify the dev data is back to the starting state (`GET /budget-envelopes?budgetPeriodId=…` equals the notes from the start).
- Record the result in T-33's Status in the implementation plan, listing what was run in the browser and what was left to the component tests.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| PATCH returns no spend and would blank the tile if written to the cache | Invalidate only; covered by F-10 and a hook test |
| The envelope's category list loads after the form opens | Disable Save until `useCategories` and the month's envelopes are loaded; show the select's loading state |
| Two panels open at once or a stale panel after a month change | Reuse the one-panel rule and the month-key reset in `MonthScreen`; covered by F-17 |
| Spend counted in both expenses and envelope (Q-3) changes what a new envelope does to the totals | Not part of T-33; QA notes the totals as the app computes them today |
| A month ends while the screen is open | 422 shows the month-closed message (T-34 refines it) |
