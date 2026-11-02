# Month Screen — Functional Specification

Status: draft 3 (aligned with the wireframes in `design.pen`) · Last updated: 2026-10-28

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
| M-10 | Recurring months running | Should | Placeholder |
| M-11 | Envelope spend | Must | Placeholder |
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
| M-25 | Past months are read-only | Must | Ready |
| M-26 | Remembered form values | Should | Ready (browser only) |

---

## 2. Definitions

These terms and calculations are used throughout the document.

| Term | Meaning |
|---|---|
| **Current month** | The current calendar month **in UTC**, the same reference the backend uses. Around midnight at month end, this can differ from your local date by a few hours |
| **Past / current / future month** | Compared with the current month |
| **Opened month** | A month that exists in the backend (a budget period). Months that don't exist yet can be viewed but are empty |
| **Row** | One line of the month table: an expense or an envelope |
| **Row type** | One-time, installment, recurring (expenses), or envelope |
| **Salary base** | Sum of the month's incomes flagged as salary |
| **Total income** | Sum of all the month's incomes |
| **Total expenses** | Sum of all expense amounts **plus** the amount **spent** in each envelope (not the envelope budgets). Until the spend API exists, envelope spend counts as 0 and the Expenses card notes "Envelope spend not included yet" |
| **Balance** | Total income − total expenses |
| **% of salary** | Row amount ÷ salary base. **Not shown for now** (out of scope, see [todo.md](todo.md)) |
| **Unpaid** | An expense with no paid date. Envelopes have no paid date and are never unpaid |
| **Overdue** | An unpaid expense whose due date is before today. Applies in every month, past ones included |
| **Money** | CAD with 2 decimals: `CAD 1,450.00`. Expense amounts are shown **without a sign**, in the regular text colour; incomes carry a plus sign in the success colour (`+ CAD 6,144.00`). Only a negative balance shows a minus sign. Compact lists (phone rows and the income panel) use the **compact form** without the currency (`1,450.00`, `+ 6,144.00`), since the app is CAD only and the totals next to them show it |

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
- Only the current month and future months can be opened. A past month that was never opened (for example, before you started using the app) shows "November 2025 wasn't tracked in the app" without an Open button. Past months that were opened are simply viewed through the month switcher (M-01).

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
- Phone: a strip of small envelope cards scrolled sideways (not collapsible).
- Clicking an envelope opens its row details (M-08).
- Until the backend provides spend data (M-11), spent values and bars show "—".

**Acceptance criteria**
- *Given* incomes of 7,375.67, expenses of 6,013.62 and envelope spend of 516.86, *then* Expenses shows CAD 6,530.48 and Balance shows CAD 845.19.
- *Given* the balance is −120.00, *then* the Balance card shows `- CAD 120.00`.

#### M-05 Month table

*As the budget owner, I want all the month's rows in one table with a total, like my spreadsheet tab.*

**How it works**
1. One table holds every expense and every envelope of the month, **without pagination**.
2. Rows appear in **order of entry**, oldest first, like the spreadsheet. The API returns each page newest first, so the frontend concatenates all pages in page order and then reverses the combined list.
3. Columns:

| Column | Content |
|---|---|
| # | Installment: `n of N` (M-09). Recurring: icon and "Month —" (M-10). Envelope: icon. One-time: empty |
| Item | Description (fixed, narrower column) |
| Category | The category as a small chip. Envelopes: their own category |
| Payment type | Takes the remaining width |
| Due | Date, "—" when none. Overdue dates in the danger colour (M-13) |
| Paid | The paid control (M-12) and the paid date. Envelopes: empty |
| Amount | `CAD 1,450.00`, without a sign, in the regular text colour. Envelope: its budget |
| Spent | Right of Amount. Envelopes only (M-11); empty for expenses |

4. There is **no total row**; the month's total expenses are on the Expenses summary card (M-04).
5. The table has no title bar; it starts with the column headers.
6. Bank, Store and Purchased are **not columns**: they are in the row details (M-08). Clicking a row opens them.
7. At 390px each row shows the paid control, Item, the type chip, Due (or the paid date) and Amount.
8. **Paid rows are dimmed** (muted text, half opacity) but stay in place; the paid control stays at full strength. Unpaid rows stand out.

**Rules**
- Envelope rows are named after their category (Grocery, Fuel…).
- Lookups deleted after an expense was recorded show as "(deleted)" on that expense, because the API doesn't return their names (gap G-3). Once the backend provides names, the real name is shown instead.

**Empty, loading, error**
- An opened month with no rows: "No expenses yet" with an **Add expense** button.
- Loading: skeleton rows.
- Error: an inline message with **Retry**.

**Acceptance criteria**
- *Given* a month with 45 expenses, *then* all 45 are listed on one page and the Expenses card matches their sum plus the envelope spend.
- *Given* I add an expense, *then* it appears as the last row.
- *Given* a 390px screen, *then* no horizontal scrolling is needed to read Item, Due, Paid and Amount.

#### M-06 Sort the table

*As the budget owner, I want to sort by due date or amount sometimes, without losing my usual order.*

**How it works**
- **Every column header is sortable** (#, Item, Category, Payment, Due, Paid, Amount, Spent): ascending, descending, then back to order of entry. There is no separate sort control.
- Sort keys: # by row type (one-time, installment, recurring, envelope); Paid by paid date, unpaid rows first; Spent by amount spent.
- Rows without a value for the sorted column go last (for example envelopes when sorting by Due or Payment, expenses when sorting by Spent).
- The sort is remembered on this device.
- The phone list has no headers, so it can't be sorted for now; it always shows order of entry.

**Acceptance criteria**
- *Given* the table, *when* I sort by Due, *then* rows run from the earliest due date, with envelopes and rows without a due date at the end.
- *Given* a sorted table, *when* I click the header a third time, *then* order of entry is restored.

#### M-07 Income list with salary

*As the budget owner, I want to check the month's incomes when I need to, without them taking space on the page all the time.*

**How it works**
1. Incomes are **not listed on the page**. The Income summary card shows the total and a **View all** link.
2. Clicking the Income card (or the Income figure in the phone's Balance card) opens the **income panel**: a side panel from the right on desktop (440px wide, over a dimmed page), a bottom sheet on the phone.
3. The panel shows:
   - the total income and how much of it is salary ("CAD 6,144.00 of this is salary");
   - each income: description, Salary badge for salary incomes, received date (if any), amount in the compact form (`+ 6,144.00`, success colour, section 2) and a row menu (Edit, Delete);
   - an **Add income** button at the bottom (M-20).
4. The panel closes with the close button, Escape, or a click on the dimmed page.

**Why a panel and not a centred modal:** the list is something you browse and act on (edit, delete, add), and the panel keeps the month visible beside it. A centred modal is kept for short, single tasks such as a form or a confirmation.

**Acceptance criteria**
- *Given* the month screen, *then* no income rows are shown on the page.
- *Given* I click the Income card, *then* the income panel opens listing every income of the month with its total.
- *Given* two incomes flagged as salary of 3,000.00 and 3,144.00, *then* both show the Salary badge and the panel reads "CAD 6,144.00 of this is salary".
- *Given* no salary income, *then* the panel says "No salary this month".

#### M-08 Row details

*As the budget owner, I want to see everything about a row, especially on my phone where columns are hidden.*

**How it works**
1. Clicking or tapping a row opens the details: a side panel from the right on desktop, a bottom sheet on the phone. The selected row is highlighted behind it.
2. Details show the type, item, category, amount and status (paid, unpaid, overdue), a **Mark as paid today** button when unpaid, and every field not shown in the table: payment type, **bank, store**, **purchased**, due and paid dates.
3. For installments they add the plan: `n of N`, amount per payment, interval, first purchase date, **end date**, and **View plan** (M-19).
4. For recurring rows they add the bill's start month, "Month —" (M-10) and a link to the bill on the Recurring screen.
5. Actions: Mark paid / unpaid, Edit, Delete (hidden in past months).

**Rules**
- End date of a plan = first purchase date + (N − 1) × interval days.

**Acceptance criteria**
- *Given* Car finance payment 78 of a 14-day plan with 104 payments starting 2023-11-10, *then* the details show 78 of 104 and the end date.
- *Given* a past month, *then* the details show no Edit, Delete or paid actions.

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

#### M-10 Recurring months running (placeholder)

*As the budget owner, I want to see how many months a recurring bill has been running, for example how many rents I've paid on this contract.*

**How it works (now)**
- Recurring rows show the recurring icon and "Month —".
- Hovering or tapping "—" explains: "Coming soon".

**When the backend supports it**
- "Month 11" replaces "Month —", counted from the bill's starting count (set on the Recurring screen).

#### M-11 Envelope spend (placeholder)

*As the budget owner, I want to see how much I've spent against each envelope, so I can slow down before going over.*

**How it works (now)**
- On desktop, the Spent column (right of Amount) shows "—" on envelope rows, with a "Spend data coming soon" tooltip. On the phone, envelope rows show "Spent —" under the item name. No progress bar.

**When the backend supports it**
- Spent shows the amount and a progress bar against the budget. Over budget: amount and bar in the danger colour.
- Envelope **spend** counts in the Expenses total and the balance; envelope budgets don't (section 2).
- Spend comes from a backend API (planned). The user never enters it.

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
- Not available in past months (M-25).
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
- Overdue = unpaid and due before today, in **any** month. A row left unpaid in a past month stays overdue, because past months can't be edited (known limitation, backend change under review in [todo.md](todo.md), BE-3).

**Acceptance criteria**
- *Given* today is 2026-11-15 and Hydro is due 2026-11-12 and unpaid, *then* Hydro's due date is in the danger colour with the alert icon.
- *Given* an unpaid row in October 2026 due 2026-10-28, *when* I view October in November, *then* it is shown as overdue.

### Expenses

All expense forms open from **+ Add → Expense**, as a dialog on desktop and a full-height sheet on the phone. The form starts with a **type** choice: One-time, Installments, Recurring.

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

**Acceptance criteria**
- *Given* I fill Description, Category, Payment type Credit Card, Bank CIBC and Amount 25.00, *when* I save, *then* the row appears last in the table and the totals update.
- *Given* a payment type with a statement and no bank, *when* I save, *then* the Bank field shows "Bank is required for this payment type" and nothing is saved.

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
- If the row uses a lookup that was deleted since, it stays selected and shows "(deleted)", but can't be chosen again once changed.
- Not available in past months (M-25).

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
- Not available in past months (M-25).

**Acceptance criteria**
- *Given* a recurring row, *when* I delete it, *then* the row is gone from this month and the bill still appears on the Recurring screen.

#### M-19 Change an installment plan's amount

*As the budget owner, I want to change the amount of all remaining payments of a plan at once.*

**How it works**
1. **View plan** (row details) opens the plan: description, `n of N` for this row, amount per payment, interval, first purchase date, end date and total.
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
- Not available in past months (M-25, see question Q-2).

**Acceptance criteria**
- *Given* I add "Salary" 6,144.00 with Salary on, *then* it shows a Salary badge and the salary base increases by 6,144.00.

#### M-21 Edit or delete an income

*As the budget owner, I want to correct or remove an income.*

**How it works**
- Each income has a menu with **Edit** (same form) and **Delete** (confirmation naming the income).

**Rules**
- Not available in past months (M-25).

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

**Acceptance criteria**
- *Given* I deleted the Fuel envelope, *when* I add an envelope, *then* Fuel is offered and the others aren't.

#### M-24 Delete an envelope

*As the budget owner, I want to remove an envelope I won't use this month.*

**How it works**
- **Delete** in the envelope row's menu, with a confirmation naming the category. Its spend leaves the totals.

**Acceptance criteria**
- *Given* the Parking envelope of 20.00, *when* I delete it, *then* it is gone from the Envelopes card and the table, and the balance rises by the amount spent in it.

### Rules across the screen

#### M-25 Past months are read-only

*As the budget owner, I want to know at a glance that a past month can't be changed, instead of finding out when saving fails.*

**How it works**
- A banner under the header: "October 2026 is closed. You can view it but not change it."
- Hidden in past months: paid controls, Edit, Delete and **+ Add**.

**Rules**
- A month is past when it's before the current month (UTC).
- If a month becomes past while the screen is open (midnight at month end) and a change is rejected, the message is "This month is now closed and can't be changed", and the screen refreshes into read-only mode.

**Acceptance criteria**
- *Given* today is in November 2026, *when* I view October 2026, *then* the banner shows and no row can be edited, deleted or ticked.

#### M-26 Remembered form values

*As the budget owner, I want the expense form to start with the values I use most, since most of my rows are Credit Card + CIBC.*

**How it works**
- A new expense starts with the **payment type, bank and category** of the last expense I saved on this device.
- Values that no longer exist (deleted lookups) are dropped.

**Acceptance criteria**
- *Given* my last expense used Credit Card and CIBC, *when* I add a new one, *then* the form starts with Credit Card and CIBC.

---

## 4. Messages for backend errors

| Backend response | Where | Message |
|---|---|---|
| 409 month exists | M-02 | "{Month} is already open." |
| 409 month not empty | M-03 | "Remove this month's expenses, incomes and envelopes first." |
| 409 envelope exists | M-23 | "{Category} already has an envelope this month." |
| 400 bank required | M-14 to M-17 | On the Bank field: "Bank is required for this payment type." |
| 400 no period for installments | M-15 | "Open the month of the first payment before adding this plan." |
| 404 lookup not found | Forms | "{Field} no longer exists. Choose another." The lists are refreshed |
| 422 past period | Update or delete of an expense, income or envelope; creating an envelope | "This month is now closed and can't be changed." The screen switches to read-only. (The backend still accepts new incomes and expenses in past months; hiding **+ Add** there is a frontend rule, M-25) |
| Network or 500 | Any | Toast: "Something went wrong. Try again." Forms keep what was typed |

---

## 5. Data used

| What | Source |
|---|---|
| Months | `GET /budget-periods` (sorted by the frontend), `POST`, `DELETE /budget-periods` |
| Expenses | `GET /expenses?budgetPeriodId=` (every page, up to 100 per page), `POST`, `PATCH`, `DELETE /expenses` |
| Installment plans | `GET`, `PATCH /installment-groups/:id`, one per plan in the month |
| Incomes | `GET /incomes?budgetPeriodId=`, `POST`, `PATCH`, `DELETE /incomes` |
| Envelopes | `GET /budget-envelopes?budgetPeriodId=`, `POST`, `DELETE /budget-envelopes` (no `PATCH`: budgets are read-only) |
| Lookups | `GET /categories`, `/payment-types`, `/banks`, `/stores` |

---

## 6. Gaps found in the backend docs

These came up while writing this document. They don't block the design but need an answer before implementation.

| ID | Gap | Effect on this screen |
|---|---|---|
| G-1 | `docs/APIs/expense.md` doesn't list the 422 for changing or deleting a past-month expense, while the software specification requires it | M-25 assumes the 422 exists |
| G-2 | Expenses only carry the installment plan's id; `N` and the end date need one request per plan | M-09 and M-08 make one extra request per plan in the month. Returning `totalInstallments` with each expense would remove them |
| G-3 | Lookup lists don't return deleted records, but expenses keep pointing to them. The frontend can't show the name of a deleted bank or category on an old expense | Without a fix, those cells show "(deleted)" instead of the name. The backend could include names on expenses, or let lookup lists include deleted records |
| G-4 | The software specification says creating a recurring expense also adds it to months after it that are already opened. The API doc only says months opened **afterwards** get a copy | M-16 needs to know which is true, to tell the user whether next month already has the row |
| G-5 | Envelope spend has no source yet | M-11 placeholder |
| G-6 | Recurring months-running count has no source yet | M-10 placeholder |

---

## 7. Decisions from review

| Question | Decision |
|---|---|
| Q-1 Show the category in the table? | Yes, as a small chip under the item (M-05) |
| Q-2 Add rows to past months (migrating from the spreadsheet)? | Out of scope for now. Past months stay read-only, and past months that were never opened can't be opened (M-02, M-25) |
| Q-3 Envelope due date? | Envelopes have no due date. They can't be ticked off or become overdue (M-12, M-13) |
| Q-4 Remember the store in the expense form? | No, payment type, bank and category only, for now (M-26) |
| How does the open-month review save incomes? | One `POST /incomes` per income, after the month is created (M-02). Backend change under review (BE-1) |
| Which incomes can be copied when opening a month? | Only last month's salary incomes (M-02) |
| Simplification (2026-10-30) | Incomes move off the page into an income panel opened from the Income card (M-07). Bank, Store and Purchased leave the table for the row details panel, opened by clicking a row (M-05, M-08). Envelopes stay mixed in the list; their spend shows under the item, and the Spent column is removed (M-11). Paid rows are dimmed (M-05, M-12) |
| Design tweaks (2026-10-30) | No "Current month" badge. Summary order: Income, Expenses, Balance (M-04). Category gets its own column and Item is narrower; the Spent column returns, right of Amount; expense amounts use the regular text colour instead of red (M-05, M-11). All table cells are left-aligned; the spend bar sits above the spent amount. No total row: the Expenses card holds the total (M-05). Every column is sortable (M-06). An Envelopes card under the summary shows all envelopes' spent vs allocated at once, instead of one card per envelope or a carousel (M-04) |
| Envelope budgets and totals (2026-10-30) | Envelope budgets can't be edited (M-22). Total expenses and balance count envelope **spend**, not envelope budgets (section 2, M-11). Spend will come from a backend API |
| Design review of the wireframes (2026-10-28) | Summary keeps Balance, Income and Expenses only, with no sub-labels (M-04). No Unpaid or Envelopes cards; overdue is shown on rows only (M-13). No table title bar or sort dropdown; sorting by column headers on desktop only (M-05, M-06). % of salary removed for now (todo.md). Expense amounts shown without a minus sign |

Out-of-scope items, unresolved questions and backend gaps for the whole app are tracked in [todo.md](todo.md).
