# Month Screen — Functional Specification

Status: draft 5 (backend delivered: envelope spend, plan size, lookup names, months running) · Last updated: 2026-11-03

The Month screen is the app's home and replaces one tab of the budget spreadsheet. This document describes every feature of the screen from the user's side: what you can do, how it works, which rules apply, what you see when something goes wrong, and how to check that it works.

The dialogs opened from this screen (expense, income and envelope forms, the open-month review, the installment plan) are specified here, because they are only reachable from it.

Related: [UX brief](../ui/ux-brief.md) · [Software specification](../software_specification.md) · [API docs](../APIs/api-reference.md) · [Design system](../../DESIGN_SYSTEM.md)

---

## 1. Feature map

Priority: **Must** = needed to replace the spreadsheet. **Should** = valuable, can follow shortly after.
Status: **Ready** = the backend supports it today. **Placeholder** = shown, waiting on the backend. **Gap** = needs a backend change to work as described (section 6).

| ID | Feature | Priority | Status |
|---|---|---|---|
| **Navigating months** | | | |
| M-01 | Switch between months | Must | Ready |
| M-02 | Open a new month (with review) | Must | Ready |
| M-03 | Delete an empty month | Should | Ready |
| **Reading the month** | | | |
| M-04 | Month summary | Must | Ready |
| M-05 | Month table | Must | Ready |
| M-06 | Sort the table | Should | Ready |
| M-07 | Income list with salary | Must | Ready |
| M-08 | Row details | Must | Ready |
| M-09 | Installment progress (`n of N`) | Must | Ready |
| M-10 | Recurring months running | Should | Ready |
| M-11 | Envelope spend | Must | Ready |
| **Paying** | | | |
| M-12 | Mark a row paid or unpaid | Must | Ready |
| M-13 | Overdue warnings | Must | Ready |
| **Expenses** | | | |
| M-14 | Add a one-time expense | Must | Ready |
| M-15 | Add an installment purchase | Must | Ready |
| M-16 | Add a recurring expense | Must | Ready |
| M-17 | Edit an expense | Must | Ready |
| M-18 | Delete an expense | Must | Ready |
| M-19 | Change an installment plan's amount | Should | Ready |
| **Income** | | | |
| M-20 | Add an income | Must | Ready |
| M-21 | Edit or delete an income | Must | Ready |
| **Envelopes** | | | |
| M-22 | Envelope budgets are read-only | Must | Ready |
| M-23 | Add an envelope | Should | Ready |
| M-24 | Delete an envelope | Should | Ready |
| **Rules across the screen** | | | |
| M-25 | Past months are edited like the current one, except envelopes | Must | Ready |
| M-26 | Remembered form values | Should | Dropped (2026-11-12) |

---

## 2. Definitions

These terms and calculations are used throughout the document.

| Term | Meaning |
|---|---|
| **Current month** | The current calendar month **in UTC**, the same reference the backend uses. Around midnight at month end, this can differ from your local date by a few hours |
| **Past / current / future month** | Compared with the current month |
| **Opened month** | A month that exists in the backend (a budget period). Months that don't exist yet can be viewed but are empty |
| **Row** | One line of the month table: an expense. Envelopes are not table rows; they live in the Envelopes card (M-04) |
| **Row type** | One-time, installment or recurring |
| **Salary base** | Sum of the month's incomes flagged as salary |
| **Total income** | Sum of all the month's incomes |
| **Total expenses** | Sum of **all** the month's expense amounts (every page, not only the one shown) **plus** the amount **spent** in each envelope (not the envelope budgets). Envelope spend is `spentAmount` on each envelope. When it is `null` (the external spend API couldn't answer) it counts as 0 and the Expenses card notes "Envelope spend not included yet". The expense part is `totalAmount` from `GET /expenses`, which sums every matching expense whatever page is requested |
| **Balance** | Total income − total expenses |
| **% of salary** | Row amount ÷ salary base. **Not shown for now** (out of scope, see [todo.md](todo.md)) |
| **Unpaid** | An expense with no paid date. Envelopes have no paid date and are never unpaid |
| **Overdue** | An unpaid expense whose due date is before today. Applies in every month, past ones included |
| **Money** | CAD with 2 decimals: `CAD 1,450.00`. Expense amounts are shown **without a sign**, in the regular text colour; incomes carry a plus sign in the success colour (`+ CAD 6,144.00`). Only a negative balance shows a minus sign. Compact lists (the phone rows) use the **compact form** without the currency (`1,450.00`), since the app is CAD only and the totals next to them show it. The income panel shows its amounts with the dollar sign (`$6,144.00`, `+ $1,500.00`) |

---

## 3. Features

### Navigating months

#### M-01 Switch between months

*As the budget owner, I want to move between months, so I can work on this month and look back at previous ones.*

**How it works**
1. The screen opens on the **current month** unless the address names another one (`?period=2026-11`).
2. The header shows the month name (`November 2026`) with **previous** and **next** arrows. The arrows step one calendar month, whether or not that month is opened.
3. Tapping the month name opens a list of all opened months, newest first, grouped by year. Picking one shows it.
4. The selected month is kept in the address, so the browser's back button and shared links return to it.

**Rules**
- The next arrow stops at December of next year (the latest month the backend accepts).
- A current or future month that isn't opened shows the empty state of M-02. A past month that was never opened shows "{Month} wasn't tracked in the app".

**Acceptance criteria**
- *Given* no month in the address, *when* I open the screen, *then* the current month is shown.
- *Given* I'm on November 2026, *when* I tap next, *then* December 2026 is shown and the address reads `?period=2026-12`.
- *Given* the month list, *when* I pick March 2026, *then* March 2026 is shown.

#### M-02 Open a new month (with review)

*As the budget owner, I want a new month set up for me and to review it before I use it, so I don't have to duplicate and fix last month's tab.*

**How it works**
1. On a month that isn't opened, the screen shows an empty state: "December 2026 hasn't been opened yet" and an **Open December 2026** button. The month list (M-01) also has an "Open {next month}" entry.
2. Tapping it creates the month. The backend generates, at once:
   - one row for each installment due that month;
   - one row for each active recurring bill;
   - one envelope for each category that uses envelopes, with a default budget.
3. A **review** opens with four sections:
   - **Recurring bills:** each with its amount, editable (to correct estimates such as Hydro).
   - **Installments:** each with `n of N`; the last payment of a plan is tagged "Last payment".
   - **Envelopes:** each with its budget, read-only (M-22).
   - **Income:** a choice between
     - **Copy last month's salary:** last month's **salary** incomes are listed with editable amounts and a checkbox each (all ticked). Other incomes are not offered.
     - **Enter salary:** a single **Salary** amount field.
4. **Done** saves the edits, creates the incomes, and closes the review on the new month.

**What gets saved, and when**

| Step | Requests |
|---|---|
| Open (step 2) | `POST /budget-periods`. The backend generates the rows and envelopes in the same transaction |
| Review loads | `GET /expenses` and `GET /budget-envelopes` for the new month; `GET /incomes` for last month, keeping only salary incomes (for copying) |
| Done: edited amounts | `PATCH /expenses/:id` for each changed row |
| Done: incomes | `POST /incomes` with `isSalary: true` for each ticked copied salary, or for the entered salary |

**Rules**
- The month is created in step 2, before the review. Closing the review without **Done** leaves the month opened with the generated rows and default budgets, and without incomes.
- Income creation is done by the frontend, one request per income, not in the backend's transaction. If one fails, the others are kept and the failed one can be retried. **Before any retry**, the frontend re-reads the month's incomes and skips any salary that already exists with the same description and amount, so a request that succeeded but whose response was lost isn't created twice. If a salary still can't be saved, the month stays usable: the review says which salary is missing, and it can be added later from the income panel (M-20). A backend change to create the salary together with the month is under review ([todo.md](todo.md), BE-1); if adopted, the incomes would be sent with the Open request instead.
- The salary field is optional. If left empty, a note says "You can add the salary later from the month".
- The copied or entered salary is created as an income flagged as salary. Its description is "Salary".
- "Copy last month's salary" is offered only when last month exists and has at least one salary income. Copied incomes keep their description.
- Only the current month and future months can be opened. A past month that was never opened (for example, before you started using the app) shows "November 2025 wasn't tracked in the app" without an Open button. Past months that were opened are reached through the month switcher (M-01) and edited like the current month (M-25).

**When something goes wrong**

| Situation | What you see |
|---|---|
| The month already exists (opened elsewhere) | "December 2026 is already open." The month is loaded |
| A saving step in the review fails | The review stays open, the failed section shows an error with **Retry**; the other sections keep their saved state |

**Acceptance criteria**
- *Given* December 2026 isn't opened, *when* I tap Open December 2026, *then* the review lists the recurring bills, installments and envelopes generated for December.
- *Given* the review, *when* I change Hydro from 105.00 to 112.40 and tap Done, *then* the Hydro row in December shows `CAD 112.40` and the Hydro template is unchanged.
- *Given* the review, *when* I choose Enter salary, type 6,144.00 and tap Done, *then* December has one income "Salary" of CAD 6,144.00 with a Salary badge.
- *Given* the review, *when* I close it without tapping Done, *then* December is opened with its generated rows and has no incomes.

#### M-03 Delete an empty month

*As the budget owner, I want to remove a month I opened by mistake.*

**How it works**
1. The month header's menu has **Delete month**.
2. A confirmation names the month. Confirming deletes it and shows the previous opened month.

**Rules**
- Only possible when the month has no expenses, incomes or envelopes. Otherwise the action is disabled with the reason: "Remove this month's expenses, incomes and envelopes first."
- Because opening a month generates rows and envelopes, a freshly opened month is usually **not** empty. Its rows must be deleted first.

**Acceptance criteria**
- *Given* a month with no rows and no incomes, *when* I delete it, *then* it disappears from the month list.
- *Given* a month with rows, *then* Delete month is disabled and explains why.

### Reading the month

#### M-04 Month summary

*As the budget owner, I want the key figures of the month at the top, so I can see where I stand without scrolling.*

**How it works**

Cards at the top of the screen, in this order:

| Card | Shows | Highlight |
|---|---|---|
| **Income** | Total income, with a **View all** link (M-07) | Success colour |
| **Expenses** | Total expenses | |
| **Balance** | Balance (section 2), last on the right | Primary fill. Minus sign when negative (the only amount shown with a sign of its own) |

Each card shows only its label and amount, with no text underneath.

On a 390px screen Balance is one card, with Income and Expenses as two figures inside it.

**Envelopes card** (below the summary cards):
- One full-width card showing **every envelope at once**: name, "spent / allocated" and a progress bar. Over-budget envelopes are shown in the danger colour and listed first.
- The header shows "{n} over budget" (when any). There is no combined total across envelopes.
- Desktop: a 4-column grid. The card can be **collapsed** with Hide / Show in its header; collapsed, it keeps only the header line (with the over-budget pill). The choice is remembered on this device.
- Phone: a strip of small envelope cards scrolled sideways. The strip can be collapsed with the same Hide / Show header and the same remembered choice as on desktop; collapsed, it keeps the header line with the over-budget pill.
- Clicking an envelope opens its row details (M-08).
- When an envelope's spend is unavailable (M-11), its spent value shows "—" and it has no bar.

**Totals while the table is paginated**
- The table loads one page at a time, but the Income, Expenses and Balance cards need the whole month.
- Every `GET /expenses` response carries `totalAmount`, the sum of all the month's expenses across pages. The Expenses card uses it (plus envelope spend), so no extra request is needed.

**Acceptance criteria**
- *Given* incomes of 7,375.67, expenses of 6,013.62 and envelope spend of 516.86, *then* Expenses shows CAD 6,530.48 and Balance shows CAD 845.19.
- *Given* the balance is −120.00, *then* the Balance card shows `- CAD 120.00`.

#### M-05 Month table

*As the budget owner, I want the month's expenses in one table, a page at a time, so the screen stays fast and focused.*

**How it works**
1. The table lists the month's **expenses**, **10 per page**, fetched from the server one page at a time (`GET /expenses?budgetPeriodId=&page=&limit=10&sortBy=&sortOrder=`).
2. Rows appear **newest first** by default (`sortBy=createdAt&sortOrder=desc`). The server can also return oldest first (`sortOrder=asc`) if the spreadsheet's order is wanted as the default later.
3. Columns:

| Column | Content |
|---|---|
| # | Installment: `n of N` (M-09). Recurring: icon and "Month 11" (M-10). One-time: empty |
| Item | Description (fixed, narrower column) |
| Category | The category as a small chip |
| Payment type | Takes the remaining width |
| Due | Date, "—" when none. Overdue dates in the danger colour (M-13) |
| Paid | The paid control (M-12) and the paid date |
| Amount | `CAD 1,450.00`, without a sign, in the regular text colour |

4. **Envelopes are not in the table.** They live in the Envelopes card (M-04), which shows each one's spent vs allocated. There is no Spent column.
5. There is **no total row**; the month's total expenses are on the Expenses summary card (M-04).
6. The table has no title bar; it starts with the column headers.
7. Bank, Store and Purchased are **not columns**: they are in the row details (M-08). Clicking a row opens them.
8. At 390px each row shows the paid control, Item, the type chip, Due (or the paid date) and Amount.
9. **Paid rows are dimmed** (muted text, half opacity) but stay in place; the paid control stays at full strength. Unpaid rows stand out.

**Pagination**
- The design system's pagination is a footer at the bottom of the table card. On desktop it shows "Showing 1–10 of 45 expenses" on the left and previous, numbered pages (with an ellipsis for long runs) and next on the right. On the phone it shows previous, "Page X of N" and next under the list. Previous and next are disabled at the ends. With a single page only the count remains, on desktop.
- It is hidden when the month fits in one page.
- The page lives in the address with the month (`?period=2026-11&page=2`), so back and refresh keep it.
- Changing month goes back to page 1. Adding an expense goes to page 1, where the new expense appears first.
- If deleting the last row of the last page leaves it empty, the previous page is shown.

**Rules**
- Category, payment type, bank and store names come with each expense and are still returned after the lookup is deleted, so old rows always show the real name.

**Empty, loading, error**
- An opened month with no expenses: "No expenses yet" with an **Add expense** button.
- Loading: skeleton rows. While turning pages, the current page stays visible until the next one arrives.
- Error: an inline message with **Retry**.

**Acceptance criteria**
- *Given* a month with 45 expenses, *then* the table shows 10 rows, the pagination reads "Page 1 of 5", and the last page has 5 rows.
- *Given* a month with 45 expenses, *then* the Expenses card shows the sum of all 45 plus the envelope spend, whatever page is shown.
- *Given* I'm on page 2 and add an expense, *then* page 1 is shown with the new expense first.
- *Given* a month with 12 expenses, *then* no pagination is shown.
- *Given* a 390px screen, *then* no horizontal scrolling is needed to read Item, Due, Paid and Amount.

#### M-06 Sort the table

*As the budget owner, I want to sort by due date or amount sometimes, without losing my usual order.*

**How it works**
- These headers are sortable: **Item, Category, Payment, Due, Paid, Amount**. Clicking cycles ascending, descending, then back to the default order (newest first). There is no separate sort control.
- Sorting is done **by the server**, across all pages: the frontend sends `sortBy` and `sortOrder` with `GET /expenses`. Sorting only the page on screen is never done.

| Header | `sortBy` |
|---|---|
| Item | `description` |
| Category | `categoryName` |
| Payment | `paymentTypeName` |
| Due | `dueAt` |
| Paid | `paidAt` |
| Amount | `amount` |

- Rows without a value (no due date, unpaid) go **last in both directions**, as the API does.
- Item, Category and Payment sort case-insensitively.
- **#** is a plain label and is never sortable.
- Changing the sort goes back to page 1. The sort is kept in the address with the month and page, and remembered on this device.
- The phone list has no headers, so it can't be sorted for now.

**Acceptance criteria**
- *Given* a month with 45 expenses, *when* I sort by Due, *then* page 1 holds the 10 earliest due dates of the whole month, and rows without a due date are on the last page.
- *Given* a sort by Paid, ascending or descending, *then* unpaid rows are at the end.
- *Given* a sorted table, *when* I click the header a third time, *then* the default order is restored and page 1 is shown.
- *Given* the table, *then* the # header has no sort control.

#### M-07 Income list with salary

*As the budget owner, I want to check the month's incomes when I need to, without them taking space on the page all the time.*

**How it works**
1. Incomes are **not listed on the page**. The Income summary card shows the total and a **View all** link.
2. Clicking the Income card (or the Income figure in the phone's Balance card) opens the **income panel**: a side panel from the right on desktop (440px wide, over a dimmed page), a bottom sheet on the phone.
3. The panel shows:
   - the total income and how much of it is salary ("$6,144.00 of this is salary"), under a "{month year} income" line;
   - each income: description, Salary badge for salary incomes, received date (if any) or "Not received yet", amount with the dollar sign (`+ $6,144.00`, success colour; in the muted text colour while the income is not received yet) and a row menu (Edit, Delete);
   - an **Add income** button at the bottom (M-20).
4. The panel closes with the close button, Escape, or a click on the dimmed page.

**Why a panel and not a centred modal:** the list is something you browse and act on (edit, delete, add), and the panel keeps the month visible beside it. A centred modal is kept for short, single tasks such as a form or a confirmation.

**Acceptance criteria**
- *Given* the month screen, *then* no income rows are shown on the page.
- *Given* I click the Income card, *then* the income panel opens listing every income of the month with its total.
- *Given* two incomes flagged as salary of 3,000.00 and 3,144.00, *then* both show the Salary badge and the panel reads "$6,144.00 of this is salary".
- *Given* no salary income, *then* the panel says "No salary this month".

#### M-08 Row details

*As the budget owner, I want to see everything about a row, especially on my phone where columns are hidden.*

**How it works**
1. Clicking or tapping a row opens the details: a side panel from the right on desktop, a bottom sheet on the phone. The selected row is highlighted behind it.
2. Below the amount and status, the details are in **tabs**, one per group: **Payment** (the default), **Dates**, **Installment plan** and **Recurring bill**. Payment and Dates are always there; the other two appear only for an installment or a recurring expense. The chosen tab is kept while stepping to another expense, and falls back to Payment if that expense doesn't have it. Details show the item (no type chip under the title: the number of an installment or the month of a recurring bill is in its tab), category (to the right of the amount) and amount; the status (paid, unpaid, overdue) is the first row of the Payment tab, a **Mark as paid today** button when unpaid, and every field not shown in the table: payment type, **bank, store**, **purchased**, due and paid dates.
3. For installments they add the plan: `n of N`, interval, first purchase date and **end date**. There is no View plan button: these fields are all the row details need, and they come with the expense. The plan's amount per payment is not shown here, because the row's own amount can differ after a single-row edit (M-17).
4. For recurring rows they add the bill's start month, "Month 11" (M-10) and a link to the bill on the Recurring screen.
5. Actions: Mark paid / unpaid, Edit, Delete (an envelope's Delete is hidden in past months).
6. **Shareable link.** The open expense or envelope is in the address: `?expense=<id>` or `?envelope=<id>`, next to `?period=` and `?page=`. Opening a row adds a history entry, so the back button closes the panel; closing it goes back to that entry, or just removes the param when the panel came from a pasted link. A link opens the details wherever the row is (any page, any sort, any month): if the address names another month than the one shown, the screen switches to the row's month (replacing the address, so back doesn't land on the wrong month). A link to something that doesn't exist, or whose month isn't opened, shows "This expense no longer exists." (or "This envelope…") and drops the param. An id that isn't shaped like one the API issues (a tampered address) is treated the same way, without a request: the id is never put into a request path unchecked. Changing month drops the selection.
7. **Previous / next.** Two arrows at the top right, beside Close, show the previous and next expense in the order of the table (the server's sort). At the last row of a page, Next continues to the first row of the next page, and Previous at the first row goes to the last row of the previous page; the table moves to that page too. The address (`?page=` and `?expense=`) updates in one step without adding history, so the back button still closes the panel in one step. A count such as `(11/36)` to the left of the arrows shows the place of the open expense in the whole month (not just its page); it is left out for an expense that isn't on the page on screen. The neighbouring page is read only when the open expense is on the edge of its page. The Up and Down arrow keys do the same while the panel is open (not when typing in a field or with a modifier key held). The arrows are disabled at the very first and very last expense of the month, and for an expense that isn't on the page on screen (a pasted link). The envelope panel has its own arrows (M-11).

**Rules**
- End date of a plan = first purchase date + (N − 1) × interval days.

**Acceptance criteria**
- *Given* Car finance payment 78 of a 14-day plan with 104 payments starting 2023-11-10, *then* the details show 78 of 104 and the end date.
- *Given* a past month, *then* an expense's details show the same actions as in the current month, and an envelope's details show no Delete.
- *Given* a link with `?expense=<id>` for an expense on page 3 of October and no `period`, *when* I open it, *then* October is shown and the details of that expense are open.
- *Given* the details of the third expense on a page are open, *when* I choose Next, *then* the fourth expense's details show and `?expense=` holds its id, and *when* I then press back, *then* the panel is closed.
- *Given* the last expense of page 1 is open, *when* I choose Next, *then* the first expense of page 2 shows, the table is on page 2 with that row highlighted, and `?page=2&expense=<id>` is in the address.
- *Given* the first expense of page 2 of 36 is open, *then* the count reads `(11/36)`.
- *Given* a link with an id that doesn't exist, *then* a message says so, the param is removed and the month stays as it was.

#### M-09 Installment progress

*As the budget owner, I want to see which payment of a plan a row is, so I know how far along I am.*

**How it works**
- The # column shows `n of N` (for example `3 of 12`).
- Two payments of the same plan in one month (a 14-day plan) are two rows: `78 of 104`, `79 of 104`.
- The end date is in the row details (M-08).

**Rules**
- N is the plan's total number of payments. If a single payment was deleted, N doesn't change.

**Acceptance criteria**
- *Given* an installment row with number 3 in a 12-payment plan, *then* # shows `3 of 12`.

#### M-10 Recurring months running

*As the budget owner, I want to see how many months a recurring bill has been running, for example how many rents I've paid on this contract.*

**How it works**
- Recurring rows show the recurring icon and "Month 11". The number is `monthsRunning` from the expense: the bill's "months already paid" starting count plus the calendar months from its start up to and including the row's month.
- It doesn't change when rows are deleted.

#### M-11 Envelope spend

*As the budget owner, I want to see how much I've spent against each envelope, so I can slow down before going over.*

**How it works**
- Spend is shown only in the Envelopes card (desktop grid and phone strip), not in the table. Each envelope shows the amount spent against its budget, with a progress bar. Over budget: amount and bar in the danger colour.
- Spend is `spentAmount` on each envelope. The backend takes it from an external spend API and applies the billing-cycle rule: a purchase made after a card's due date counts in the next month, so future months can already have spend. The user never enters it.
- The envelope panel has previous / next arrows (and the Up / Down keys) with a count such as `(2/6)`, in the order of the Categories card (over budget first). The address updates without adding history.
- Envelope **spend** counts in the Expenses total and the balance; envelope budgets don't (section 2).

**When something goes wrong**
- If the spend service can't answer, the envelopes still load with `spentAmount: null`. Each shows "—" with no bar, spend counts as 0 in the totals, and the Expenses card notes "Envelope spend not included yet".

### Paying

#### M-12 Mark a row paid or unpaid

*As the budget owner, I want to tick off a bill as soon as it's paid, and later check when I paid it.*

**How it works**
1. Each expense row has a paid control (a checkbox).
2. Ticking it sets the paid date to **today**. The row stays where it is and is dimmed (M-05).
3. Unticking clears the paid date.
4. The paid date shows next to the checkbox (desktop) and under the item as "Paid 1 Nov" (phone).
5. A different paid date is set in the expense form (M-17).

**Rules**
- Available in past months (M-25).
- Envelopes have no paid control.

**When something goes wrong**
- The change fails: the checkbox returns to its previous state and an error toast says "Couldn't update the paid status. Try again."

**Acceptance criteria**
- *Given* an unpaid row in the current month, *when* I tick it, *then* its paid date is today and is shown on the row.
- *Given* a paid row, *when* I untick it, *then* it has no paid date and counts as unpaid again.

#### M-13 Overdue warnings

*As the budget owner, I want bills that are past due and not paid to stand out.*

**How it works**
- An overdue row's due date is shown in the danger colour with an alert icon, with an "Overdue" label for screen readers and on the phone.
- Overdue rows are flagged in the table only; there is no overdue count in the summary.

**Rules**
- Overdue = unpaid and due before today, in **any** month. A row left unpaid in a past month stays overdue until it is marked paid, which past months now allow (M-12).

**Acceptance criteria**
- *Given* today is 2026-11-15 and Hydro is due 2026-11-12 and unpaid, *then* Hydro's due date is in the danger colour with the alert icon.
- *Given* an unpaid row in October 2026 due 2026-10-28, *when* I view October in November, *then* it is shown as overdue.

### Expenses

All expense forms open from **+ Add → Expense**, as a side panel on desktop (like the expense details) and a full-height sheet on the phone. The form will start with a **type** choice (One-time, Installments, Recurring); until installments and recurring bills are built (M-15, M-16) it holds only the one-time fields, on one page. Required fields are marked with a red asterisk. A field that fails validation gets a red border and no message text (screen readers still hear the reason). Problems only the server can detect (a deleted lookup, the bank rule, a future purchase date it rejects) also show as a toast.

The panel ends with **Finish & close**, **Finish & add another** (saves, keeps the panel open and clears the form, keeping the category, payment type and bank) and **Cancel**.

**Fields shared by all types**

| Field | Required | Notes |
|---|---|---|
| Description | Yes | |
| Category | Yes | Active categories only |
| Payment type | Yes | Active payment types only |
| Bank | When the payment type has a statement | Always visible; marked required when needed |
| Store | No | |

The expense is created in the month being viewed (except installments, see M-15).

#### M-14 Add a one-time expense

*As the budget owner, I want to record a single purchase or bill.*

**Extra fields:** Amount (required), Purchased date, Due date, Paid date (all optional).

**Rules**
- Amount: positive, at most 2 decimals, at most 99,999,999.99.
- Amount field: the digits fill in from the cents as they are typed (`10050` reads `100.50`, `1005000` reads `10,050.00`).
- Purchased date: not after today (UTC, as the API checks). The date picker stops at today, and a later date gets the red border. Due and Paid dates are not limited.

**Acceptance criteria**
- *Given* I fill Description, Category, Payment type Credit Card, Bank CIBC and Amount 25.00, *when* I choose Finish & close, *then* the panel closes, the table goes back to page 1 with the new row, and the totals update.
- *Given* the same values, *when* I choose Finish & add another, *then* the expense is saved, the panel stays open with Description and Amount empty, and Category, Payment type and Bank unchanged.
- *Given* a payment type with a statement and no bank, *when* I save, *then* the Bank field gets a red border and nothing is saved.

#### M-15 Add an installment purchase

*As the budget owner, I want to record a purchase paid over several payments and have each payment placed in the right month automatically.*

**Extra fields**

| Field | Required | Notes |
|---|---|---|
| Amount per payment | Yes | |
| Number of payments | Yes | At least 2 |
| Interval | Yes | Presets: Monthly (30 days), Every 2 weeks (14 days), or a custom number of days |
| First purchase date | Yes | |

**How it works**
1. While typing, a preview summarises the plan: "12 payments of CAD 50.00, every 30 days, from 15 Nov 2026 to 6 Oct 2027. Total CAD 600.00."
2. On save, the backend places each payment in the month of its due date. Payments falling in months that aren't opened yet appear when those months are opened.
3. A toast confirms where the payments went: "3 payments added to Nov 2026 – Jan 2027. The rest will appear as those months are opened."

**Rules**
- Due date of payment *n* = first purchase date + (n − 1) × interval days. "Monthly" is 30 days, so due dates drift slowly against calendar dates; the preview shows the real end date.
- The plan is placed by its dates, not by the month being viewed. If the first payment falls in another month, the row doesn't appear in the current table, and the toast says so.
- Only the first payment has a purchase date.
- The first purchase date can't be in the future (the API answers 400).
- At least one payment must fall in an opened month; otherwise the form says "Open the month of the first payment before adding this plan."

**Acceptance criteria**
- *Given* a 3-payment monthly plan from 2026-11-15 and November and December opened, *when* I save, *then* payment 1 is in November, payment 2 in December, and payment 3 appears when January is opened.
- *Given* an interval of 14 days from 2026-11-05, *then* two payments fall in November.

#### M-16 Add a recurring expense

*As the budget owner, I want to add a bill that repeats every month, so new months include it automatically.*

**Extra fields:** Amount (required), Due date, Paid date (optional).

**How it works**
1. A note under the type choice explains: "Added to this month and copied into every month you open from now on. Manage it on the Recurring screen."
2. On save, this month's row and the bill (template) are created together.

**Rules**
- The bill starts in the month being viewed.
- Months after this one that are already opened: see gap G-4.

**Acceptance criteria**
- *Given* I add "Netflix" as recurring in November 2026, *when* I open December 2026, *then* December has a Netflix row with the same amount, payment type, bank and store.

#### M-17 Edit an expense

*As the budget owner, I want to fix an expense, for example the real amount of a bill.*

**How it works**
1. **Edit** (row menu or details) opens the form with the row's values. The type can't change.
2. Editable: Description, Category, Payment type, Bank, Store, Amount, Purchased, Due and Paid dates.
3. Bank and Store can be cleared (unless the payment type requires a bank).

**Rules**
- Changes apply to **this row only**:
  - installment row: the other payments and the plan don't change. A note says "To change all remaining payments, edit the plan" with a link (M-19);
  - recurring row: the bill and other months don't change. A note links to the bill on the Recurring screen.
- If the row uses a lookup that was deleted since, it stays selected with its name and a "(deleted)" mark (the name comes with the expense), but can't be chosen again once changed.
- Available in past months (M-25).

**Acceptance criteria**
- *Given* a recurring Hydro row of 105.00, *when* I change it to 112.40, *then* only this month's Hydro shows 112.40 and next month's opens with 105.00.
- *Given* an installment row, *when* I change its amount, *then* the other payments of the plan keep theirs.

#### M-18 Delete an expense

*As the budget owner, I want to remove an expense entered by mistake or a payment that won't happen.*

**How it works**
1. **Delete** opens a confirmation naming the row.
2. The message depends on the type:
   - one-time: "Delete {item}?";
   - installment: "Delete payment {n} of {N} of {item}? The other payments stay.";
   - recurring: "Delete {item} from {month}? The bill keeps repeating in future months. To stop it, cancel it on the Recurring screen."
3. Confirming removes the row and updates the totals.

**Rules**
- Deleting an installment payment doesn't reduce N (`n of N` still counts it).
- Available in past months (M-25).

**Acceptance criteria**
- *Given* a recurring row, *when* I delete it, *then* the row is gone from this month and the bill still appears on the Recurring screen.

#### M-19 Change an installment plan's amount

*As the budget owner, I want to change the amount of all remaining payments of a plan at once.*

**How it works**
1. *Entry point to be decided.* The row details have no View plan button (dropped 2026-11-09), so this flow needs another way in, such as an action in the installment section of the details.
2. **Change amount** lets me enter a new amount per payment.
3. The confirmation says: "Payments in {current month} and later will change to CAD {amount}. Earlier payments keep their amount."

**Rules**
- Only the amount per payment can change. Number of payments, interval and first purchase date are fixed.

**Acceptance criteria**
- *Given* a plan with payments in October, November and December and today in November, *when* I change the amount to 120.50, *then* November and December show 120.50 and October keeps its amount.

### Income

#### M-20 Add an income

*As the budget owner, I want to record money received this month and mark my salary.*

**How it works**
1. **+ Add → Income** or **Add income** in the income panel (M-07) opens the form.
2. Fields: Description (required), Amount (required), Salary (switch, off by default), Received date (optional).
3. The income is created in the month being viewed.

**Rules**
- Several incomes can be flagged as salary; all count towards the salary base.
- Available in past months (M-25).

**Acceptance criteria**
- *Given* I add "Salary" 6,144.00 with Salary on, *then* it shows a Salary badge and the salary base increases by 6,144.00.

#### M-21 Edit or delete an income

*As the budget owner, I want to correct or remove an income.*

**How it works**
- Each income has a menu with **Edit** (same form) and **Delete** (confirmation naming the income).

**Rules**
- Available in past months (M-25).

**Acceptance criteria**
- *Given* the only salary income, *when* I delete it, *then* the income footer says "No salary this month".

### Envelopes

#### M-22 Envelope budgets are read-only

*As the budget owner, I want envelope budgets to come from the system, so they stay consistent month to month.*

**How it works**
- An envelope's budget (allocated amount) is set by the backend when the month is opened and **can't be edited** in the app: there is no Edit budget action, on the row, the Envelopes card, the row details or the open-month review.
- The backend's `PATCH /budget-envelopes/:id` is not used by the frontend.

**Acceptance criteria**
- *Given* any envelope, *then* no control lets me change its budget.

#### M-23 Add an envelope

*As the budget owner, I want to add an envelope that wasn't created with the month, for a category that uses envelopes.*

**How it works**
1. **+ Add → Envelope** opens a form: Category (only categories that use envelopes and don't have one this month) and Budget. This is the one exception to M-22: `POST /budget-envelopes` requires an `allocatedAmount`, so the budget is entered once on creation and can't be changed afterwards. **Pending decision:** whether adding and deleting envelopes stay at all (see [todo.md](todo.md), U-2).
2. If every such category already has an envelope, the option is disabled: "Every envelope category already has an envelope this month."
3. Not available in past months (the backend answers 422; M-25).

**Acceptance criteria**
- *Given* I deleted the Fuel envelope, *when* I add an envelope, *then* Fuel is offered and the others aren't.

#### M-24 Delete an envelope

*As the budget owner, I want to remove an envelope I won't use this month.*

**How it works**
- **Delete** in the envelope's details panel (opened from the Envelopes card), with a confirmation naming the category. Its spend leaves the totals.
- Not available in past months (the backend answers 422; M-25).

**Acceptance criteria**
- *Given* the Parking envelope of 20.00, *when* I delete it, *then* it is gone from the Envelopes card, and the balance rises by the amount spent in it.

### Rules across the screen

#### M-25 Past months are edited like the current one, except envelopes

*As the budget owner, I want to fix, pay and add rows in a month that has ended, the same way as in the current month.*

**How it works**
- A small "Past month" pill beside the month name. Its note says: "You can edit this month. Envelopes of past months can't be changed."
- In an opened past month, paid controls, Edit, Delete and **+ Add** for expenses and incomes work as in the current month.
- Envelopes are the exception: the backend answers 422 when an envelope of a past period is created or deleted, so **+ Add → Envelope** and the envelope's Delete are hidden.

**Rules**
- A month is past when it's before the current month (UTC).
- A past month that was never opened still shows "{Month} wasn't tracked in the app", with no Open action (M-02).
- An installment plan's amount change applies only from the current month onward; past rows keep their amount (installment-group API).
- If a month becomes past while the screen is open (midnight at month end) and an envelope change is rejected, the message is "Envelopes of past months can't be changed" and the screen refreshes.

**Acceptance criteria**
- *Given* today is in November 2026, *when* I view an opened October 2026, *then* the Past month pill shows, and I can tick a row paid, edit and delete expenses and incomes, and add new ones.
- *Given* the same month, *then* the envelope details have no Delete.

#### M-26 Remembered form values

*Dropped on 2026-11-12.* The expense form always opens empty; nothing is remembered between expenses. The only carry-over is within one sitting: **Finish & add another** keeps the category, payment type and bank for the next expense (M-14).

---

## 4. Messages for backend errors

| Backend response | Where | Message |
|---|---|---|
| 409 month exists | M-02 | "{Month} is already open." |
| 409 month not empty | M-03 | "Remove this month's expenses, incomes and envelopes first." |
| 409 envelope exists | M-23 | "{Category} already has an envelope this month." |
| 400 bank required | M-14 to M-17 | Red border on the Bank field, and a toast: "Bank is required for this payment type." |
| 400 no period for installments | M-15 | "Open the month of the first payment before adding this plan." |
| 400 future purchase date | M-14 to M-17 | Red border on the Purchased field, and a toast: "The purchase date can't be in the future." (installments: the first purchase date, M-15) |
| 404 lookup not found | Forms | Red border on the field, and a toast: "{Field} no longer exists. Choose another." The lists are refreshed |
| 422 past period | Creating or deleting an envelope of a past period (expenses and incomes no longer return it) | "Envelopes of past months can't be changed." |
| Network or 500 | Any | Toast: "Something went wrong. Try again." Forms keep what was typed |

---

## 5. Data used

| What | Source |
|---|---|
| Months | `GET /budget-periods` (sorted by the frontend), `POST`, `DELETE /budget-periods` |
| Expenses | `GET /expenses?budgetPeriodId=&page=&limit=10&sortBy=&sortOrder=`, one page at a time; its `totalAmount` feeds the Expenses card. `POST`, `PATCH`, `DELETE /expenses`. `GET /expenses/:id` only for a link to an expense that isn't on the page on screen (rows opened on screen are cached, so no request) |
| Installment plans | `n of N`, interval, first purchase date and end date come with each expense (`installment`). `GET`, `PATCH /installment-groups/:id` only for changing the amount (M-19) |
| Incomes | `GET /incomes?budgetPeriodId=`, `POST`, `PATCH`, `DELETE /incomes` |
| Envelopes | `GET /budget-envelopes?budgetPeriodId=` (with `spentAmount`), `GET /budget-envelopes/:id` only for a link to an envelope that isn't in the month on screen, `POST`, `DELETE /budget-envelopes` (no `PATCH`: budgets are read-only) |
| Lookups | `GET /categories`, `/payment-types`, `/banks`, `/stores` |

---

## 6. Gaps found in the backend docs

These came up while writing this document. They don't block the design but need an answer before implementation.

| ID | Gap | Effect on this screen |
|---|---|---|
| G-4 | The software specification says creating a recurring expense also adds it to months after it that are already opened. The API doc only says months opened **afterwards** get a copy | M-16 needs to know which is true, to tell the user whether next month already has the row |
| G-12 | Envelopes carry only `categoryId`, so the name of a category deleted after the envelope's month can't be shown | The Envelopes card and envelope details show "(deleted)" for it |

G-2, G-3, G-5 and G-6 were delivered by the backend on 2026-11-03 (plan size, lookup names, envelope spend and months running now come with the API responses).

---

## 7. Decisions from review

| Question | Decision |
|---|---|
| Q-1 Show the category in the table? | Yes, as a small chip under the item (M-05) |
| Q-2 Add rows to past months (migrating from the spreadsheet)? | Opened past months accept new expenses and incomes (M-25). Out of scope for now: opening a past month that was never opened, so those can't be opened or filled (M-02, M-25) |
| Q-3 Envelope due date? | Envelopes have no due date. They can't be ticked off or become overdue (M-12, M-13) |
| Q-4 Remember the store in the expense form? | No. Later (2026-11-12) the remembered values were dropped altogether (M-26) |
| How does the open-month review save incomes? | One `POST /incomes` per income, after the month is created (M-02). Backend change under review (BE-1) |
| Which incomes can be copied when opening a month? | Only last month's salary incomes (M-02) |
| Simplification (2026-10-30) | Incomes move off the page into an income panel opened from the Income card (M-07). Bank, Store and Purchased leave the table for the row details panel, opened by clicking a row (M-05, M-08). Envelopes stay mixed in the list; their spend shows under the item, and the Spent column is removed (M-11). Paid rows are dimmed (M-05, M-12) |
| Design tweaks (2026-10-30) | No "Current month" badge. Summary order: Income, Expenses, Balance (M-04). Category gets its own column and Item is narrower; the Spent column returns, right of Amount; expense amounts use the regular text colour instead of red (M-05, M-11). All table cells are left-aligned; the spend bar sits above the spent amount. No total row: the Expenses card holds the total (M-05). Every column is sortable (M-06). An Envelopes card under the summary shows all envelopes' spent vs allocated at once, instead of one card per envelope or a carousel (M-04) |
| Server-side pagination (2026-11-02) | The table is paginated on the server, 10 rows per page, newest first (M-05). Envelope rows and the Spent column leave the table; envelopes live in the Envelopes card (resolves U-3). The API sorts across pages (`sortBy`, `sortOrder`), so every header except # is sortable; Category and Payment use the names BE-4 delivered (M-06). The Expenses card uses `totalAmount` from the expenses response, with no extra request (M-04) |
| Backend delivered (2026-11-03) | Envelope spend, installment plan size, lookup names and months running come from the API (M-08 to M-11). Spend can be `null` when the external service is down; the screen shows "—" and keeps the note on the Expenses card |
| Envelope budgets and totals (2026-10-30) | Envelope budgets can't be edited (M-22). Total expenses and balance count envelope **spend**, not envelope budgets (section 2, M-11). Spend will come from a backend API |
| Design review of the wireframes (2026-10-28) | Summary keeps Balance, Income and Expenses only, with no sub-labels (M-04). No Unpaid or Envelopes cards; overdue is shown on rows only (M-13). No table title bar or sort dropdown; sorting by column headers on desktop only (M-05, M-06). % of salary removed for now (todo.md). Expense amounts shown without a minus sign |

Out-of-scope items, unresolved questions and backend gaps for the whole app are tracked in [todo.md](todo.md).
