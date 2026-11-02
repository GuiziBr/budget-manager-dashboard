# UX Design Brief — Budget Manager Dashboard

Status: draft 2 · Owner: design · Last updated: 2026-10-28

This is the first design artifact for the budget manager frontend. It records who the app is for, what problem it solves, what the user does and how often, and the decisions that shape every screen. Wireframes and visual designs come next and must trace back to this document.

Sources: user interview (4 rounds, 2026-10-27), answers to the open questions of draft 1 (2026-10-28), the user's November 2026 spreadsheet, `docs/software_specification.md`, `docs/APIs/`, `DESIGN_SYSTEM.md`.

---

## 1. Background

The app replaces a personal budget spreadsheet. The spreadsheet has **one tab per month**, and each tab is a single table:

| Install | Payment Type | Bank | Store | Item | Purc. Date | Due Date | Payed Date | Amount | Partial | % of Salary | Income |
|---|---|---|---|---|---|---|---|---|---|---|---|

- Expenses, envelope budgets (Grocery, Restaurants, Fuel, Baby Stuff), savings transfers and investments all sit in the same table and count towards the same total.
- *Partial* is the amount spent so far against an envelope.
- *Income* is a side column; the cell under it holds the month's balance (income − expenses).
- A total row closes the table: total amount and total % of salary.

The backend models the same month as a `BudgetPeriod` with expenses (one-time, installment, recurring), incomes and budget envelopes, and generates installment rows, recurring rows and envelopes when a month is opened.

## 2. The user

There is one user. Nobody else edits or views the budget.

| Trait | Detail |
|---|---|
| Frequency | Opens the budget **daily** |
| Devices | **Phone and desktop equally**: phone for quick checks and logging, desktop for the monthly setup |
| Data entry | Fills **most fields** for each expense: item, amount, payment type, bank, store, due date |
| Currency | **CAD only**, shown as `CAD 1,450.00` |
| Mental model | "The month is a table." Rows are listed in **order of entry** |
| Looking back | **Often**. Compares totals over time, envelope spend, a specific item over time, and the same month last year. A comparison screen is out of scope for now (section 12); until then, past months are reached through the month switcher |

## 3. Problems to solve

These are the user's pain points with the spreadsheet, in their words:

1. **Monthly setup.** Duplicating last month's tab, then fixing amounts, dates and installment numbers, checking which recurring bills and installments still apply, setting envelope budgets and entering expected income.
2. **Editing on the phone.** A wide spreadsheet is hard to update on a small screen.
3. **Finding things.** How far along an installment plan is, when it ends, and how long a bill has been running.

## 4. Goals and success criteria

| Goal | We know it works when |
|---|---|
| Setting up a month is a review, not a rebuild | A new month is ready in **under 2 minutes**, with no copying or retyping |
| Daily check takes seconds | Balance, unpaid bills and envelope progress are visible **without scrolling**, on phone and desktop |
| Ticking off a bill is instant | Marking a row paid takes **one tap** |
| Logging on the phone is comfortable | A fully filled expense can be added on a 390px screen in **under 30 seconds** |
| The app never lies about rules | Read-only months, required fields and blocked deletions are visible **before** the user tries, not only as errors |

## 5. Tasks and frequency

Frequency decides prominence. The more often a task happens, the fewer steps it takes and the more visible its control.

| Task | Frequency | Design response |
|---|---|---|
| Check balance, unpaid bills and envelope progress | Daily | Summary at the top of the month, always visible |
| Mark a bill paid | Many times a month | One-tap control on every row; sets the paid date to today |
| Look up when something was paid | Occasionally | Paid date stays visible on the row (desktop) or in the row details (phone) |
| Add an expense (most fields) | Several times a week | Quick add from anywhere in the month; fields remember the last values used |
| Correct a variable bill (Hydro, Phone) | Monthly per bill | Inline amount edit on the row. The estimate comes from the recurring template |
| Open a new month | Monthly | A guided review that replaces "duplicate the tab" (section 8.1) |
| Set envelope budgets | Monthly | Part of the open-month review; editable later on the row |
| Enter expected income | Monthly | Part of the open-month review |
| Look at a past month | Often | Month switcher; past months open read-only |
| Check installment progress and end date | Occasionally | `n of N` on the row, end month in the row details |
| Change or cancel a recurring bill | Rarely | Recurring screen |
| Manage categories, payment types, banks, stores | Rarely | Settings screen |

## 6. Design principles

1. **The month is the unit.** Everything for a month lives on one screen, like a spreadsheet tab. No separate pages for expenses, incomes and envelopes.
2. **Familiar first, better second.** Keep the spreadsheet's columns, order of entry and total row so the switch is painless. Improve only where the sheet hurts: setup, phone editing, finding things.
3. **Status at a glance.** Balance, what's unpaid and how envelopes are doing are answered before the user scrolls or taps.
4. **Phone is a first-class device.** Every daily and weekly task works one-handed at 390px. Only the monthly setup may prefer the desktop, and it must still work on the phone.
5. **Show the rules, don't just enforce them.** Past months look read-only, the bank field appears only when the payment type needs it, and lookups in use say so before a delete is attempted.
6. **Honest placeholders.** Features waiting on the backend show a visible placeholder ("—" with a note), never invented numbers.
7. **Follow the design system.** Tokens, components and patterns from `DESIGN_SYSTEM.md`. Deviations are deliberate and listed in section 11.

## 7. Information architecture

| Screen | Purpose | Nav |
|---|---|---|
| **Month** (home) | The spreadsheet tab: every expense, envelope and income of one month, its summary and its total | Primary |
| **Recurring** | Recurring templates: amount, start, months running, cancel or reactivate | Primary |
| **Settings** | Categories, payment types, banks, stores (tabs), and the theme | Primary |

- **Month switcher** in the Month screen header: previous and next arrows (like moving between tabs) and a popover listing every opened month, plus "Open {next month}".
- The selected month lives in the URL (`?period=2026-11`) and defaults to the current month.
- Dialogs, not screens: expense form (one-time, installment, recurring), income form, envelope form, open-month review, installment plan details, delete confirmations.
- Phone tab bar: Month, Recurring, Settings. The More sheet is not needed; the theme setting moves to Settings.

## 8. Key flows

### 8.1 Open a new month (replaces "duplicate the tab")

1. From the month switcher or the empty state of an unopened month: **Open December 2026**.
2. The backend creates the month and generates installment rows, recurring rows and envelopes.
3. A **review step** shows what was generated, grouped:
   - Recurring bills, with their amounts as estimates (editable)
   - Installments, with `n of N` (finishing plans highlighted)
   - Envelopes, with allocated amounts (editable)
4. **Income:** the review offers to copy last month's incomes as this month's expected income, so they don't have to be retyped.
   - **Copy:** last month's **salary** incomes (only those) are listed with their amounts (editable) and created when the user confirms.
   - **Don't copy:** a **Salary** amount field is shown instead. Salary is the main income, so the month starts with it; it is created as an income flagged as salary. Other incomes are added later from the month.
   - The backend does not generate incomes, so the frontend creates them in both cases.
5. Done: the user lands on the new month.

### 8.2 Mark a bill paid

- One tap on the row's paid control sets the paid date to today.
- Tapping again clears it (marks unpaid).
- Choosing a different paid date is done in the row edit form.

### 8.3 Add an expense

- **+ Add** opens a menu: Expense, Income, Envelope.
- The expense form starts with a type choice: one-time, installment, recurring. Installment adds number of payments and interval; recurring explains that the bill will repeat every month.
- Payment type, bank and store default to the last values used.
- The bank field is always shown and becomes required when the payment type has a statement.
- Deleted lookups are not offered.

### 8.4 Correct a variable bill

- Rows generated from a recurring template carry the template's amount as an estimate.
- The amount is edited inline on the row (desktop) or in the row details (phone).
- Editing a row does not change the template or other months. Changing the template is done on the Recurring screen.
- Estimated amounts are **not** marked as estimates. A recurring row looks like any other row whether or not its amount has been corrected.

### 8.5 Check an installment plan

- The row shows `n of N` (for example `3 of 12`).
- Row details show the end month, the interval and the amount per payment, and allow changing the amount per payment, which updates this and future months.
- Two payments in the same month (Car finance 78 and 79, every 14 days) are two rows of one plan.

## 9. Month screen requirements

> **Superseded in part by the design review of 2026-10-28.** The summary now holds Balance, Income and Expenses only; there are no Unpaid or Envelopes cards, % of salary is out of scope for now, expense amounts are shown without a minus sign, and the table has no sort dropdown. `docs/specs/month-screen.md` is the reference for the Month screen.

### 9.1 Summary (top, always visible)

In order of importance from the interview:

1. **Balance** (income − expenses − envelope allocations). Shown in danger colour and with a minus sign when negative.
2. **Unpaid:** count and amount of rows not yet paid, with overdue rows called out.
3. **Envelopes:** how many are on track and how many are over budget. Placeholder until spend is available (section 10).
4. **Income** and **Expenses** totals.
5. **% of salary** is secondary: shown on the total row and as a smaller figure, not as a headline card.

### 9.2 Table

Rows are listed in **order of entry** (oldest first), like the sheet. The API returns newest first, so the frontend reverses it. Sorting by due date is offered as an option.

| Column | Content | Phone |
|---|---|---|
| # | Installment `n of N`; recurring icon with months running (placeholder); envelope icon | Chip under the item |
| Item | Description | Shown |
| Payment type | | Details |
| Bank | | Details |
| Store | | Details |
| Purchased | Date | Details |
| Due | Date; overdue in danger colour when unpaid | Shown, compact |
| Paid | One-tap control; paid date on hover or in details | Shown |
| Amount | Signed, `- CAD 1,450.00` | Shown |
| Spent | Envelope rows only: spent and a progress bar. Placeholder for now | Details |
| % of salary | | Details |

- **Total row** at the bottom: total amount (expenses + envelope allocations) and total % of salary.
- **Income section** under the table: each income with its amount; the salary income(s) carry a **Salary** badge. The salary base (sum of salary incomes) is named next to the % of salary figure so the percentage is explainable.
- **Row actions:** edit, delete, mark paid or unpaid, view installment plan, view recurring template.

### 9.3 Row types

| Type | How to tell | Shown as |
|---|---|---|
| One-time | No plan, no template | Plain row |
| Installment | Part of an installment plan | `n of N` chip |
| Recurring | Generated from a template | Recurring icon + months running |
| Envelope | Budget envelope for a category | Envelope icon, Amount = allocated, Spent column filled |

### 9.4 States

| State | Treatment |
|---|---|
| Current month | Fully editable |
| Future month | Editable |
| Past month | Read-only banner; edit, delete and paid controls hidden. Rows left unpaid stay **overdue** |
| Month not opened | Empty state with **Open {month}** |
| Row unpaid, not due | Default |
| Row unpaid, overdue | Due date in danger colour, counted in the summary |
| Row paid | Paid control checked; row text unchanged (paid is the normal end state, not "done and hidden") |
| Envelope over budget | Spent and progress bar in danger colour (once spend exists) |
| Negative balance | Balance card in danger colour |
| Loading | Skeleton rows and cards |
| Error | Inline message with Retry |

### 9.5 Alerts

In-app only, no notifications:

- **Overdue bills:** highlighted rows and a count in the summary. This applies to past months too: a row whose due date has passed and has no paid date is overdue, whichever month it belongs to.
- **Envelope over budget:** danger-coloured progress bar and a count in the summary.
- **Negative balance:** danger-coloured balance.

## 10. Placeholders (waiting on the backend)

| Feature | Placeholder | Needed from backend |
|---|---|---|
| Envelope **Spent** | "—" with a "Spend data coming soon" tooltip; no progress bar; envelope summary shows "—" | Actual spend per envelope (from the external spend API) |
| Recurring **months running** (e.g. Rent month 11 of the contract) | "Month —" next to the recurring icon | A count per recurring row |
| Recurring **starting count** (months already paid before the app, e.g. a rent contract that began earlier) | A disabled "Months already paid" field on the recurring template form, with a "Coming soon" note | A field on the recurring template that the count starts from |
| **Salary** flag | Uses `isSalary` on incomes | Already planned: backend returns which income is salary |

## 11. Constraints and deviations

### Design system
- Follow `DESIGN_SYSTEM.md`: semantic tokens only, light and dark, desktop and 390px.
- **Deviation:** the Month table is **not paginated**. A month has about 30 rows; the frontend fetches every page and shows one table with a total row. The design system's pinned pagination doesn't apply.
- **Deviation:** the table has up to 11 columns, more than the 1120px page column comfortably holds. Columns hide progressively by breakpoint, and the details view holds the rest.

### API
- Expenses are listed newest first, filtered only by month, at most 100 per page. Totals are calculated in the browser.
- No endpoint lists installment plans. End month and `N` come from `GET /installment-groups/:id`, one request per plan in the month. A plan summary on the expense row would avoid this.
- Expenses in past months cannot be updated (`422`), so the paid date of a past row cannot be set. A row left unpaid when its month ends is shown as overdue (deferred, section 13).

## 12. Out of scope (for now)

- **History**: comparing months, envelope spend, an item over time, same month last year. The user does this often, so it is the first candidate for a later phase. It needs a backend endpoint with per-month totals.
- Multiple users, sharing, authentication
- Push or email notifications
- Currencies other than CAD
- Budget forecasting and goals
- Installment deferral and recurring bills that start in a future month (planned backend features; to be designed when they exist)

## 13. Open questions

None at the moment.

### Deferred

- **Paying a bill after its month ends.** Past months are read-only, so a bill paid after its month has ended (for example, a 28-Nov due date paid on 2 December) can't be marked paid. For now such rows are simply shown as **overdue**; the user will resolve this later. Tracked as BE-3 in `docs/specs/todo.md` (letting the backend accept `paidAt` on past-month expenses).

### Resolved in draft 2

| Question | Decision |
|---|---|
| Mark recurring amounts as estimates? | No (section 8.4) |
| Copy incomes when opening a month? | Offer to copy; if declined, ask for the salary (section 8.1) |
| How far back should History go? | History is out of scope for now (section 12) |
| Do unpaid rows in past months count as overdue? | Yes (sections 9.4 and 9.5) |
| Where does the months-running count start? | Out of scope; placeholder field (section 10) |

## 14. Next steps

1. Low-fidelity wireframes: Month screen (desktop and 390px), open-month review, add expense, row details.
2. High-fidelity designs with the design system, light and dark.
3. Backend requests from sections 10, 11 and 13 raised with the backend.
