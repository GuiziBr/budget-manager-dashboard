# Recurring Screen — Functional Specification

Status: draft 1 · Last updated: 2026-11-26

The Recurring screen is where the budget owner looks after the bills that repeat every month (rent, Netflix, Hydro): see what is set up, correct an amount, stop a bill that has ended, or remove one. It is used rarely, but it is the only place that changes a bill for the months still to come.

A recurring bill is a **template**. Each opened month gets one expense row copied from it. Changing the template never touches rows already in a month; changing a row never touches the template (UX brief §8.4).

Related: [UX brief](../ui/ux-brief.md) · [Software specification](../software_specification.md) · [Recurring API](../APIs/recurring-expense.md) · [Month spec](month-screen.md) · [Management spec](settings-screen.md) · [Backlog](todo.md) · [Design system](../../DESIGN_SYSTEM.md)

---

## 1. Feature map

Priority: **Must** = needed to replace the spreadsheet. **Should** = valuable, can follow shortly after.
Status: **Ready** = the backend supports it today. **Gap** = needs a backend change or an answer (section 6).

Feature IDs keep the numbering of [todo.md](todo.md) (R-01 to R-10).

| ID | Feature | Priority | Status |
|---|---|---|---|
| R-01 | List recurring bills: description, amount, category, payment type, bank, store, start month | Must | Ready (see G-16) |
| R-02 | Show active and cancelled bills separately | Should | Ready |
| R-03 | Months running for each bill ("Month 11") | Should | Ready |
| R-04 | "Months already paid" starting count: editable on the bill, and a field on the Month screen's recurring expense form | Should | Ready |
| R-05 | Edit a bill's description, amount and months already paid; applies to months opened afterwards only | Must | Ready |
| R-06 | Cancel a bill: choose the last month it appears in (current month or later) | Must | Ready (see Q-1) |
| R-07 | Reactivate a cancelled bill | Should | Gap (BE-2) |
| R-08 | Delete a bill (also cancels it; rows already generated stay) | Must | Ready |
| R-09 | Add a recurring bill: opens the Month screen's expense form (M-16) on the current month | Should | Ready |
| R-10 | Empty, loading and error states | Must | Ready |

---

## 2. Definitions

| Term | Meaning |
|---|---|
| **Bill** | A recurring template (`RecurringExpense`). Not an expense row |
| **Start month** | The month of `startedAt`: the first month the bill appears in |
| **Last month** | The month of `cancelledAt`. The backend copies a bill into a month while `cancelledAt` is empty or **on or after the first day of that month**, so the bill still appears in its last month and not after it |
| **Active** | `cancelledAt` is empty. The bill appears in every month opened from now on |
| **Ending** | `cancelledAt` is in the current month or later. The bill still appears until its last month, and is then over |
| **Cancelled** | `cancelledAt` is before the first day of the current month. The bill no longer appears in new months |
| **Upcoming** | `startedAt` is after the current month. Only possible once the backend supports bills that start in a future month (todo §2.1); shown as "Starts {Month}" if it ever arrives. Not designed further |
| **Months running** | `monthsAlreadyPaid` plus the calendar months from the start month up to and including the reference month, counted inclusively (a bill started in January 2026 is "Month 11" in November 2026). The reference month is the current month for an active or ending bill and the last month for a cancelled one. Same definition as the backend's `monthsRunning` on expense rows (M-10), which the list can't read because the API returns templates only (G-16) |
| **Current month** | In UTC, the same reference the backend uses |

Sections: **Active** holds active and ending bills (an ending bill carries an "Ends {Month}" badge). **Cancelled** holds cancelled bills.

---

## 3. Features

### The list (R-01, R-02, R-03, R-10)

*As the budget owner, I want to see every bill I have set up and what each one costs.*

**How it works**
1. The screen is one page at `/recurring`. The page title is **Recurring**. A header shows the heading, the count of active bills and the **Add recurring bill** button (R-09).
2. Two cards, **Active** and **Cancelled**, each with its bills and a count. **Cancelled** is collapsed by default and remembers how it was left (`use-persisted-boolean`, like the Month screen's sections). It is hidden when there are no cancelled bills.
3. On desktop each section is a table: Description, Amount, Category, Payment type, Store, Starts, Months running, and a row menu. The bank is shown under the payment type ("Credit card · Nubank"). An empty store or bank shows "—". Rows are sorted by description, ignoring case; headers don't sort and the lists aren't paginated (a household has tens of bills, not hundreds).
4. On the phone each bill is a card with the description and amount on the first line, the category and payment type under it, and "Month 11" and the start month on the last line. The row menu button has a 44px touch target. The whole card isn't tappable.
5. **Months running** reads "Month 11". A bill with a starting count shows the total, not the part counted here.
6. Amounts use the app's money format. The **Starts** column reads "Jan 2026".
7. A bill whose category, payment type, bank or store was deleted afterwards shows "(deleted)" in that cell, because the API returns ids only (G-16).
8. Loading shows skeleton rows. A failed load shows an inline error with **Retry**. No bills at all shows "No recurring bills yet. Add one from the Month screen" with the Add button.

**Acceptance criteria**
- *Given* Rent started in January 2026 with no starting count, *then* in November 2026 its row says "Month 11".
- *Given* Rent with `monthsAlreadyPaid: 10` started in January 2026, *then* in November 2026 it says "Month 21".
- *Given* a bill cancelled in September 2026, *then* it is under Cancelled and not under Active, and its months running stop at September.
- *Given* a bill ending in December 2026, *then* in November it is under Active with an "Ends December" badge.
- *Given* a bill whose store was deleted, *then* the Store cell reads "(deleted)".

### Edit (R-04, R-05)

*As the budget owner, I want to correct what a bill costs or what it is called, so next month opens with the right amount.*

**How it works**
1. **Edit** in the row menu opens a form in a side panel on desktop and a full-height sheet on the phone, the same shell (`DetailsSheet`) as the Management and income forms, titled "Edit {description}", with **Save** and **Cancel**.
2. Fields (react-hook-form + Zod, required fields marked with an asterisk):

| Field | Rules |
|---|---|
| Description\* | Trimmed, not empty |
| Amount\* | A monetary amount, greater than zero, two decimals (the Month form's rule) |
| Months already paid | A whole number, 0 or more. Hint: "Months you paid before adding this bill here. It sets where the count starts." |

3. A note at the top: "Changes apply to months you open from now on. Months that are already open keep their rows." Category, payment type, bank, store and start month aren't editable: the API doesn't allow it. They are shown above the fields as read-only text, with: "To change them, cancel this bill, delete its rows in months that are already open, and add a new one." Without the cleanup, those months would carry both the old and the new bill
4. Only the fields that changed are sent. Saving with no change closes without a request.
5. On success the panel closes, the list refreshes and a toast says "{Description} saved".

**Rules**
- Cancelled bills can be edited too (a typo in the name, or the starting count), but a change to the amount or description has no further effect, since the bill no longer produces rows. The panel still shows the note.
- Changing **Months already paid** changes the "Month n" on the bill's existing and future expense rows, because the backend counts from the template. The Month screen's expenses are refreshed after the save.
- Only one panel is open at a time. The panel closes if the bill disappears.

**When something goes wrong**

| Situation | What you see |
|---|---|
| The bill was deleted meanwhile (404) | "This recurring bill no longer exists." The panel closes and the list refreshes |
| Invalid value (400) | The generic toast "Couldn't save the recurring bill. Try again." The form stays open with what was typed |
| Anything else | The same generic toast |

**Acceptance criteria**
- *Given* Hydro at 105.00, *when* I change it to 112.40 and save, *then* the list shows 112.40, the already-open November row still shows its own amount, and a month opened afterwards has 112.40.
- *Given* a bill, *when* I open Edit and save without changes, *then* no request is sent.
- *Given* Rent with a starting count of 0, *when* I set it to 10, *then* the row says Month 21 (for a January 2026 start, in November 2026) and the Month screen's Rent row says the same after the refresh.

### Cancel (R-06)

*As the budget owner, I want to stop a bill that has ended, such as a finished contract, so new months don't include it.*

**How it works**
1. **Cancel bill** in the row menu opens a dialog: "Cancel {description}?" with a select, **Last month it appears in**, listing the current month and the next 11, the current month chosen by default. The API has no upper limit on the date, so an ending bill whose last month is beyond those 12 gets that month added to the list, and starts on it. Below it: "It won't be added to any month after {Month}. Months that are already open keep their rows: delete them from the Month screen if you don't want them."
2. **Cancel bill** (the confirm button, destructive style) sends `cancelledAt` as the first day of the chosen month. **Keep bill** closes the dialog.
3. On success the dialog closes, the bill moves to Cancelled once its last month is past (until then it stays under Active with "Ends {Month}"), and a toast says "{Description} will end after {Month}", or "{Description} cancelled" when the last month is the current one.
4. The action isn't offered on a bill that is already cancelled. On an ending bill it reads **Change end month** and the select starts on the current last month. A bill can't be set back to active in this version (R-07).

**Rules**
- The backend refuses a date before the first day of the current UTC month (400), so the select starts at the current month.
- A bill whose last month is the **current** month stops producing rows from next month on, but this month's row stays.
- Cancelling doesn't delete anything: the bill stays in the list and its past rows stay in their months.

**When something goes wrong**

| Situation | What you see |
|---|---|
| The bill was deleted meanwhile (404) | "This recurring bill no longer exists." The dialog closes and the list refreshes |
| The date was refused (400) | "Couldn't cancel the bill. Try again." The dialog stays open. Can happen if the month rolled over while the dialog was open: the select is rebuilt from the new current month |
| Anything else | The same generic toast |

**Acceptance criteria**
- *Given* it is November 2026 and December isn't opened, *when* I cancel Netflix with last month November, *then* opening December gives no Netflix row and November's row stays.
- *Given* Netflix ending in December, *when* I open the dialog again, *then* the select starts on December.
- *Given* a bill ending in December 2028 and it is November 2026, *when* I open the dialog, *then* December 2028 is in the list and selected.
- *Given* December is already open, *when* I cancel Netflix with last month November, *then* the dialog warns that December keeps its row, and it does.

### Reactivate (R-07) — blocked

The software specification says `cancelledAt` can be cleared to bring a bill back. The API rejects it today (`cancelledAt` can't be set back to `null`, BE-2). Until the backend allows it, the screen has no Reactivate action and the cancel dialog doesn't offer "Keep running". When BE-2 lands: **Reactivate** in the menu of ending and cancelled bills, a confirmation, and `cancelledAt: null`. A bill cancelled long ago would only start producing rows again in months opened from then on.

### Delete (R-08)

*As the budget owner, I want to remove a bill I added by mistake or no longer want to see.*

**How it works**
1. **Delete** in the row menu opens `ConfirmDeleteModal`: "Are you sure you want to delete the recurring bill {description}?" with the explanation "Months that already have this bill keep their rows."
2. Confirming sends `DELETE`. The backend also cancels the bill, so it stops producing rows. On success the row leaves the list and a toast says "{Description} deleted".

**Rules**
- A deleted bill can't be brought back from the app, and isn't listed under Cancelled (the backend no longer returns it). Cancel is the choice when the bill might matter later.
- Rows already generated stay in their months. They stay recurring rows: their "Edit the bill on the Recurring screen" link then leads to a bill that no longer exists. Whether the Month screen should hide the link for those rows is open (Q-3).
- There is no "in use" refusal.

**When something goes wrong**

| Situation | What you see |
|---|---|
| Already deleted (404) | Counts as deleted: the list refreshes, no error |
| Anything else | The generic toast "Couldn't delete the recurring bill. Try again." and the row stays |

**Acceptance criteria**
- *Given* Netflix, *when* I confirm the delete, *then* it leaves the list, and the months that had a Netflix row still have it.

### Add a recurring bill (R-09)

*As the budget owner, I want to add a bill from here without finding my way back to the Month screen.*

**How it works**
1. **Add recurring bill** in the header goes to `/month?add=recurring`. The Month screen opens on the **current month** with the expense form already open and the **Recurring** type chosen (M-16). The `add` parameter is removed from the address once the form is open, so Back and a refresh don't reopen it.
2. If the current month isn't opened, the Month screen shows its usual "Open {Month}" state and the parameter is dropped: the bill can't be created until the month exists (it starts in the month being viewed).
3. After saving, the user stays on the Month screen. The bill is on the Recurring screen when they return.
4. The Month screen's recurring form gets the **Months already paid** field (R-04), with the same hint as the edit form, so the starting count can be set when the bill is created and not only afterwards.

**Acceptance criteria**
- *Given* the current month is open, *when* I tap Add recurring bill, *then* I'm on the Month screen with the form open on Recurring.
- *Given* I fill the form with Months already paid 10 and save, *then* the bill appears on the Recurring screen with Month 11 plus ten more counted from its start (Month 11 in its first month).

---

## 4. Rules across the screen

- **Editing is always allowed.** There are no read-only states on this screen.
- **Strings** live in `src/constants/translations.ts`; colours only through tokens.
- **Cache.** One query key, `RECURRING_EXPENSES_QUERY_KEY`, holds the list and the single bill the Month screen reads (T-34). Every change invalidates it. A change to **Months already paid** also invalidates `EXPENSES_QUERY_KEY`, because the expense rows carry `monthsRunning`. Cancel and delete don't change any expense row, so they don't invalidate the expenses.
- **Names.** The list reads the four lookup lists (already cached, 10 minutes) to turn ids into names. It doesn't show names until they've loaded, with a skeleton in those cells.
- **Month screen link.** "Edit the bill on the Recurring screen" (M-17, details panel) keeps opening `/recurring`. It doesn't select the bill: the page has no shareable row link in this version. If wanted later: `?bill=<id>` opening the edit panel, as `?expense=` does on the Month screen.
- **Layout.** Checked in light and dark, on desktop and at 390px, with nothing scrolling sideways.

## 5. Backend endpoints used

| Need | Endpoints |
|---|---|
| List | `GET /recurring-expenses` (all templates, no filter or pagination) |
| Edit | `PATCH /recurring-expenses/:id` (`description`, `amount`, `monthsAlreadyPaid`) |
| Cancel | `PATCH /recurring-expenses/:id` (`cancelledAt`, on or after the first day of the current UTC month) |
| Delete | `DELETE /recurring-expenses/:id` |
| Add | `POST /expenses` with `type: "recurring"` and, optionally, `monthsAlreadyPaid` (the Month screen's form) |
| Names | `GET /categories`, `/payment-types`, `/banks`, `/stores` (already used) |

`GET /recurring-expenses/:id` already has a hook (`useRecurringExpense`, for the Month screen's panel). The list doesn't need it.

---

## 6. Gaps and questions

| ID | Item | Effect on this screen |
|---|---|---|
| BE-2 | `cancelledAt` can't be set back to `null` | R-07 is blocked. Tracked in [todo.md](todo.md) §2.4 |
| G-16 | The recurring resource returns ids only: no nested `{ id, name }` for category, payment type, bank or store (expenses have them), and no `monthsRunning` | The screen resolves names from the lookup lists and shows "(deleted)" when an id isn't there (a deleted lookup can still be on a cancelled bill). It computes months running itself, with the backend's definition. Suggested fix: return the nested objects and `monthsRunning` on templates, like on expenses |
| Q-1 | **Last month semantics.** The API docs say a bill is copied while `cancelledAt` is empty or on or after the first day of the month. This spec reads that as "`cancelledAt` = the first day of the last month the bill appears in" | Verify against the real API before building the dialog: cancel with the current month, then open the next month and check there is no row, and check that a bill cancelled for December still appears in December. If it differs, reword the dialog, the toast and the badge |
| Q-2 | Does `PATCH` with `monthsAlreadyPaid` refresh `monthsRunning` on rows already generated? The docs define it as computed (template count plus months), so it should | Verify with Edit. If rows keep a stored value, drop the "Months already paid" line from the Edit rules and the cache rule |
| Q-3 | After a bill is deleted, its rows still link to `/recurring`, which has nothing to edit for them. The Month screen's panel reads the bill through `useRecurringExpense`, so a 404 there is detectable | Proposal: the Month panel hides the link on a 404. Small change in `ExpenseDetailsPanel`; plan task RC-09 |

## 7. Decisions to confirm

| Question | Proposal |
|---|---|
| Months already paid | **Supersedes the UX brief's placeholder** (§13: a disabled "Coming soon" field). The backend delivered `monthsAlreadyPaid` on 2026-11-03 (BE-D), so the field is live on the edit form and on the Month screen's recurring form |
| Cancel wording | Ask for the **last month it appears in**, not "cancel from": it matches what the backend does and avoids the off-by-one |
| Row details | No details panel: everything is in the row, and the edit panel shows the read-only fields. Revisit if more fields appear |
| Sorting and filtering | None: by description, two sections. Add sorting only if the list outgrows a screen |
| Total of active bills | Not included. Useful ("what do my recurring bills cost per month"), but not in the feature map; add it as a header figure if wanted |
| Editing category, payment type, bank and store | Not possible with the current API (PATCH takes description, amount, cancelledAt and monthsAlreadyPaid). The panel says to cancel and re-add |

Out-of-scope items and backend gaps for the whole app are tracked in [todo.md](todo.md).
