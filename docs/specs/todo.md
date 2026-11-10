# To Do — Specs Backlog

Last updated: 2026-11-03

What's left to specify, decide or ask the backend for. Current focus is the [Month screen](month-screen.md); the screens below are picked up once it's implemented.

---

## 1. Functional specification: other screens

Feature maps only. Each screen gets a full spec (user stories, rules, errors, acceptance criteria) in the format of [month-screen.md](month-screen.md) when it's picked up.

Priority: **Must** = needed to replace the spreadsheet. **Should** = valuable, can follow shortly after.
Status: **Ready** = the backend supports it today. **Placeholder** = shown, waiting on the backend. **Gap** = needs a backend change (section 2.3).

### 1.1 App shell

Needed alongside the Month screen, since the Month screen lives inside it.

| ID | Feature | Priority | Status |
|---|---|---|---|
| A-01 | Navigation: sidebar on desktop, tab bar on the phone, with Month, Recurring and Settings | Must | Ready |
| A-02 | Page title in the top bar for each screen | Must | Ready |
| A-03 | Remove the More sheet; move the theme switch to Settings. Ships with the Settings screen (S-13): until then the theme switch stays where it is | Must | Ready |

### 1.2 Recurring screen

| ID | Feature | Priority | Status |
|---|---|---|---|
| R-01 | List recurring bills: description, amount, category, payment type, bank, store, start month | Must | Ready |
| R-02 | Show active and cancelled bills separately (filter or sections) | Should | Ready |
| R-03 | Months running for each bill ("Month 11") | Should | Ready |
| R-04 | "Months already paid" starting count on the bill form (`monthsAlreadyPaid`) | Should | Ready |
| R-05 | Edit a bill's description and amount; applies to months opened afterwards only | Must | Ready |
| R-06 | Cancel a bill from a chosen month (current month or later) | Must | Ready |
| R-07 | Reactivate a cancelled bill | Should | Gap (BE-2) |
| R-08 | Delete a bill (also cancels it; rows already generated stay) | Must | Ready |
| R-09 | Add a recurring bill: opens the expense form of the Month screen (M-16) on the current month | Should | Ready |
| R-10 | Empty, loading and error states | Must | Ready |

### 1.3 Settings screen

One tab per lookup, plus appearance. Lists are short and not paginated.

| ID | Feature | Priority | Status |
|---|---|---|---|
| S-01 | Categories: list, with "Uses envelopes" shown per category | Must | Ready |
| S-02 | Categories: add and rename | Must | Ready |
| S-03 | Categories: turn envelopes on or off (affects months opened afterwards) | Must | Ready |
| S-04 | Categories: delete, blocked while in use with the reason shown | Must | Ready |
| S-05 | Payment types: list, with "Requires a bank" shown per type | Must | Ready |
| S-06 | Payment types: add and rename | Must | Ready |
| S-07 | Payment types: turn "Requires a bank" on or off | Must | Ready |
| S-08 | Payment types: delete, blocked while in use | Must | Ready |
| S-09 | Banks: list, add, rename | Must | Ready |
| S-10 | Banks: delete, blocked while in use | Must | Ready |
| S-11 | Stores: list, add, rename | Must | Ready |
| S-12 | Stores: delete, blocked while in use | Must | Ready |
| S-13 | Appearance: light or dark theme | Must | Ready |
| S-14 | Duplicate names rejected with a clear message | Must | Ready (see G-7) |

---

## 2. Open items

### 2.1 Out of scope for now

| Item | Decided in | Notes |
|---|---|---|
| History screen: totals over time, envelope spend over time, an item over time, same month last year | UX brief §12 | First candidate for a later phase. Needs per-month totals from the backend (G-10) |
| Migrating past months from the spreadsheet; adding rows to past months | Month spec §7 (Q-2) | Past months that were never opened can't be opened (opened past months are editable, except envelopes, M-25) |
| Starting point of the recurring months-running count | UX brief §13 | Placeholder field R-04 |
| Multiple users, sharing, authentication | UX brief §12 | |
| Push or email notifications | UX brief §12 | Warnings are in-app only |
| Currencies other than CAD | UX brief §12 | |
| Budget forecasting and goals | UX brief §12 | |
| Installment deferral (move a payment to the end of the plan) | UX brief §12 | Planned backend feature; design when it exists |
| Recurring bills that start in a future month | UX brief §12 | Planned backend feature; design when it exists |
| Remembering the store in the expense form | Month spec §7 (Q-4) | "Fine for now" |
| % of salary (per row, on the total row and in the summary) | Design review 2026-10-28 | Removed from the Month screen for now; to be addressed later. Salary is still flagged on incomes and the salary base is shown in the income footer |
| Summary cards for Unpaid and Envelopes | Design review 2026-10-28 | Removed; overdue bills are flagged on their rows only. Envelope spend lives in the Envelopes card |
| Sorting on the phone | Design review 2026-10-28 | The phone list has no headers and no sort control, so it always shows order of entry |

### 2.2 Unresolved questions

| ID | Question | Current behaviour | Blocks |
|---|---|---|---|
| U-2 | Do adding and deleting envelopes (M-23, M-24) stay? Adding one means entering its budget, while budgets are otherwise read-only (M-22) | Kept in the spec, with the budget entered once on creation | Plan task T-33 |

U-1 (marking a bill paid after its month ends) and BE-3 were resolved on 2026-11-10: the backend now lets expenses and incomes of past months be changed, so past months are edited like the current one (envelopes excepted, M-25). G-1 (undocumented 422 for past-month expenses) is resolved with it. U-3 (envelope rows in the table) was resolved on 2026-11-02: with server-side pagination, envelopes live only in the Envelopes card.

### 2.3 Backend gaps

| ID | Gap | Affects | Suggested fix |
|---|---|---|---|
| G-4 | The software specification says a new recurring expense is also added to months after it that are already opened; the API doc says only months opened afterwards get a copy | M-16 | Confirm which is true and align the docs |
| G-7 | Lookup names: the software specification says unique ignoring case, the API docs say exact (case-sensitive) match | S-02, S-06, S-09, S-11, S-14 | Confirm which rule applies |
| G-9 | No endpoint lists installment plans, so plans can only be reached from their expense rows | M-19 | `GET /installment-groups`, if a list of plans is ever wanted |
| G-12 | `BudgetEnvelope` carries only `categoryId`, so the name of a category deleted after the envelope's month can't be shown (the same problem G-3 had for expenses) | M-04, M-08 | Return `category: { id, name }` on envelopes |

G-8 moved to BE-2, G-10 to BE-5, G-11 to BE-3. G-2 (plan size on expenses), G-3 (names of deleted lookups), G-5 (envelope spend) and G-6 (months running) were delivered by the backend on 2026-11-03: see [expense.md](../APIs/expense.md), [budget-envelope.md](../APIs/budget-envelope.md) and [recurring-expense.md](../APIs/recurring-expense.md).

### 2.4 BE API review

Backend API changes to review with the backend before or during the Month screen implementation.

| ID | Item | Today | Proposed change | Affects |
|---|---|---|---|---|
| BE-1 | Create the salary together with the month | `POST /budget-periods` creates the month and generates rows and envelopes, but not incomes. The frontend then sends one `POST /incomes` per salary, outside the backend's transaction | Accept the month's salary incomes in the `POST /budget-periods` body (for example `incomes: [{ description, amount, isSalary }]`) and create them in the same transaction. One request opens the month, and it never ends up opened without its salary | M-02 |
| BE-2 | Reactivate a cancelled recurring bill | The software specification says `cancelledAt` can be cleared to reactivate a bill; `PATCH /recurring-expenses/:id` doesn't allow setting it back to `null` | Allow `cancelledAt: null` on the PATCH (or add a reactivate action), and align the specification and the API docs | R-07 |
| BE-4 | Sort expenses by category and payment type | `GET /expenses` now sorts across pages by `description`, `amount`, `purchasedAt`, `dueAt`, `paidAt`, `installmentNumber`, `createdAt`, `updatedAt`. It has no key for the category and payment type **names** (expenses only carry their ids) | Add `sortBy` values for the category and payment type names. **Delivered 2026-11-03** as `categoryName` and `paymentTypeName`, documented in [expense.md](../APIs/expense.md); the same change made the `description` sort case-insensitive. Details: [t-06-backend-requirements.md](t-06-backend-requirements.md) | M-06 (Category and Payment headers) |
| BE-5 | Totals across months | `GET /expenses` returns `totalAmount` for the month, which covers the Month screen's Expenses card. Comparing months (History) would still need one request per month | A summary endpoint for a range of months, when History is picked up | History |
