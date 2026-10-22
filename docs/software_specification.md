# Budget Manager Server — Software Specification

## Overview

A NestJS backend for personal budget management. It tracks monthly budget periods, expenses (one-time, installment, and recurring), income, and spending envelopes backed by an external API for real-time category balances.

---

## Domain Model

## Core Concept: Budget Periods

Everything in the system is scoped to a **BudgetPeriod** — a single calendar month identified by `year` and `month` (e.g., March 2026). Expenses, incomes, and budget envelopes all belong to one period.

A partial unique index enforces that no two active (non-deleted) periods share the same `(year, month)`.

---

## Expense Tracking

All three expense types land as rows in the `EXPENSE` table. The `installment_group_id` and `recurring_expense_id` foreign keys distinguish the type:

### One-Time Expenses
Manually entered by the user. Both `installment_group_id` and `recurring_expense_id` are null.

### Installment Purchases
When a user registers an installment purchase (e.g., a $600 laptop over 3 months), an `INSTALLMENT_GROUP` record is created. The system then auto-generates one `EXPENSE` row per installment, each assigned to the correct future `BudgetPeriod`.

- Due dates are computed as: `first_purchase_date + (installment_number - 1) × payment_interval_days`
- `payment_interval_days` supports any cadence (30 for monthly, 14 for bi-weekly, etc.)
- `purchase_date` is only populated on the first installment; subsequent rows are system-generated

### Recurring Expenses
A `RECURRING_EXPENSE` acts as a template for an expense that repeats every month (e.g., Netflix, gym membership, rent).

- `started_at` — the month the recurring expense first appears; always set to the budget period of the expense being created
- `cancelled_at` — when set, stops future generation; past rows are untouched
- When a new `BudgetPeriod` is opened, one `EXPENSE` row is auto-generated per active recurring template (where `cancelled_at` is null or after the period's month)

**Creation flow:** Recurring expenses are not created via a standalone endpoint. Instead, when creating an expense the caller sets `isRecurring: true` on `POST /expenses`. The backend atomically (in a single DB transaction):
1. Creates the `RecurringExpense` template (`startedAt` set to the budget period's month)
2. Creates the first `Expense` row linked to the template via `recurringExpenseId`
3. Queries all existing `BudgetPeriod` rows strictly after `startedAt` and bulk-inserts one backfill `Expense` row per period, linked to the same template

The backfill in step 3 is necessary because period-open is a one-shot event — any recurring template created after a period is already open would otherwise never receive an expense row for that period. A partial unique index on `(budget_period_id, recurring_expense_id) WHERE deleted_at IS NULL` prevents duplicate rows regardless of creation order.

**Management:** Existing recurring expenses are managed via `GET /recurring-expenses`, `GET /recurring-expenses/:id`, `PATCH /recurring-expenses/:id` (to update description, amount, or set `cancelledAt`), and `DELETE /recurring-expenses/:id`.

---

## Income

`INCOME` rows belong to a `BudgetPeriod` and represent money received that month.

- `is_salary = true` flags incomes that form the salary base
- Multiple salary incomes per period are supported (e.g., two payroll deposits on different days)
- **% of salary** is a derived metric, computed at query time as:
  ```
  expense.amount / SUM(income.amount WHERE is_salary = true)
  ```
  It is not stored — always derived on demand.

---

## Budget Envelopes

A `BUDGET_ENVELOPE` pairs a `Category` with a `BudgetPeriod` and an `allocated_amount` (the planned spending cap for that category that month).

Only categories where `has_budget_envelope = true` participate in envelope budgeting.

- **Allocated amount** — stored locally; set when the period is opened (user can adjust)
- **Actual spend** — not stored; fetched from an external REST API at query time (e.g., `GET /balances?category=Groceries&month=2026-03`)
- **Remaining** — derived: `allocated_amount − actual_spend`
- **Auto-allocation** — when opening a new period, `allocated_amount` is pre-filled from a local constants file (`src/shared/constants/budget-envelope-amounts.ts`) keyed by category name. Integration with an external API to derive amounts from the last 3 months' actual spend is a planned future feature.

A partial unique index enforces that no two active envelopes share the same `(budget_period_id, category_id)`.

---

## Opening a New Budget Period

When a user opens a new month (e.g., April 2026), the system executes the following steps in order:

1. **Generate installment rows** — Find all `INSTALLMENT_GROUP` records with installments due in the new month (based on `first_purchase_date` and `payment_interval_days`) and create the corresponding `EXPENSE` rows
2. **Generate recurring rows** — Find all `RECURRING_EXPENSE` records where `cancelled_at` is null or after the new period's month and create one `EXPENSE` row each
3. **Create budget envelopes** — For each `CATEGORY` where `has_budget_envelope = true`, create a `BUDGET_ENVELOPE` row with `allocated_amount` sourced from a local constants file (`src/shared/constants/budget-envelope-amounts.ts`); the user can adjust via `PATCH /budget-envelopes/:id` afterward. External API-based auto-allocation is a planned future feature.
4. **Activate the period** — The period becomes active and ready for manual expense entry

---

## Supporting Lookup Tables

### Category
Expense categories (e.g., Groceries, Entertainment, Transportation).
- `has_budget_envelope = true` — marks categories that participate in envelope budgeting and for which the external API is queried

### PaymentType
Payment methods (e.g., Credit Card, Debit Card, Cash, Pre-authorized).
- `has_statement = true` — requires the expense to be linked to a `Bank`

### Bank
Financial institutions (e.g., CIBC, Neo). Nullable on expenses — cash payments have no bank.

### Store
Merchants/vendors (e.g., Amazon, Loblaws). Nullable on expenses — not all purchases are at a specific store.

---

## Pagination

List endpoints for **lookup tables** (Bank, Store, Category, PaymentType) are unbounded — result sets are small and stable.

List endpoints for **transactional records** (Expense, Income) support offset-based pagination via `page` and `limit` query parameters.

---

## Soft Deletes

All models include a `deleted_at` timestamp. No records are physically deleted. All queries filter `WHERE deleted_at IS NULL`. Uniqueness constraints (budget periods, budget envelopes) are enforced via partial indexes scoped to non-deleted rows.

---

## Business Rules

### Budget Period

- `year` must be an integer in the range `[2000, current_year + 1]`; `month` must be in `[1, 12]` — violations return **400**
- `(year, month)` must be unique among non-deleted periods; creating a duplicate returns **409 Conflict** (e.g., "A budget period for 2026/03 already exists")
- Budget periods are **immutable** — `year` and `month` cannot be changed after creation
- A period **cannot be soft-deleted** if it has any linked non-deleted expenses, incomes, or budget envelopes — returns **409 Conflict**

### Budget Envelope

- A budget envelope **cannot be updated or soft-deleted** if its budget period's `(year, month)` is before the current calendar month — returns **422 Unprocessable Entity**
- Only valid for categories where `hasBudgetEnvelope = true`; creating an envelope for any other category returns **400**
- `(budgetPeriodId, categoryId)` must be unique among non-deleted envelopes; duplicates return **409 Conflict**
- `allocatedAmount` must be a positive value with at most 2 decimal places (max 99,999,999.99)

### Expense

- An expense **cannot be updated or soft-deleted** if its budget period's `(year, month)` is before the current calendar month — returns **422 Unprocessable Entity**
- Must always reference a **non-deleted** `BudgetPeriod`, `Category`, and `PaymentType`
- If the referenced `PaymentType.hasStatement = true`, a `bankId` is **required**; omitting it returns **400**
- `bankId` and `storeId` are optional; if provided (non-null), they must reference a **non-deleted** Bank/Store on create and update — otherwise **404**. Existing expenses keep their reference if the bank/store is deleted later (historical integrity is preserved)
- All monetary amounts: max 2 decimal places, up to 99,999,999.99
- Expense type is determined by the presence of foreign keys:
  - **One-time**: both `installmentGroupId` and `recurringExpenseId` are null
  - **Installment**: `installmentGroupId` is set
  - **Recurring-generated**: `recurringExpenseId` is set

### Recurring Expense

- Must reference a **non-deleted** `Category` and `PaymentType` at creation time
- `cancelledAt` must be ≥ the first day of the current calendar month; past-month dates return **400**
- Setting `cancelledAt` stops generation of new expense rows for future periods; already-generated rows are untouched; `cancelledAt` can be cleared to reactivate the template
- **Soft-deleting** a `RecurringExpense` also sets `cancelledAt = now()` atomically, ensuring no future rows are generated; already-generated rows are untouched
- `description`, `amount`, and `cancelledAt` can be updated freely after creation; FK references (`categoryId`, `paymentTypeId`, `bankId`, `storeId`) are immutable

### Installment Group

- Due date per installment: `firstPurchaseDate + (installmentNumber - 1) × paymentIntervalDays`
- `purchaseDate` is set only on the first installment row; subsequent system-generated rows leave it null
- Only `amountPerInstallment` can be updated via `PATCH /installment-groups/:id`; `totalInstallments` is **read-only** (sending it returns **400**) because changing it would require adding or removing expense rows
- Updating `amountPerInstallment` cascades atomically to all non-deleted linked expense rows whose budget period's `(year, month)` is ≥ the current calendar month — past rows are left untouched
- `paymentIntervalDays` and `firstPurchaseDate` are immutable after creation
- `PATCH /installment-groups/:id` is the only way to change `amountPerInstallment`; updating `amount` on an individual expense row via `PATCH /expenses/:id` does not cascade to siblings or the group

### Income

- Multiple incomes with `isSalary = true` per period are allowed (e.g., split payroll deposits)
- **% of salary** is derived at query time — `expense.amount / SUM(income.amount WHERE isSalary = true)` for the same period — and is never stored
- An income **cannot be updated or soft-deleted** if its budget period's `(year, month)` is before the current calendar month — returns **422 Unprocessable Entity**

### Lookup Tables (Category, PaymentType, Bank, Store)

- Names must be **unique case-insensitively** among non-deleted records within each table; duplicates return **409 Conflict**
- **Category / PaymentType** cannot be soft-deleted while actively referenced (see below); once deleted, they still appear on historical expenses but **cannot be selected when creating new expenses or recurring expenses**
- **Bank / Store** cannot be soft-deleted while actively referenced (see below); existing expenses retain their `bankId` / `storeId` reference for historical display; soft-deleted Bank/Store cannot be selected for new or updated expenses
- **Active reference** (applies to Category, PaymentType, Bank and Store): a non-deleted `RecurringExpense` that is not cancelled (or is cancelled on/after the first day of the current UTC month), or a non-deleted `Expense` in the current or a future budget period. Deleting such a record returns **409 Conflict**; references from past-period expenses do not block deletion.
- For **Category** only, a non-deleted `BudgetEnvelope` in the current or a future budget period is also an active reference

### Soft Delete (universal)

- No records are physically deleted; all deletions set `deletedAt = now()`
- All queries filter `WHERE deletedAt IS NULL`, except when displaying historical expense data which must still resolve soft-deleted Category, PaymentType, Bank, and Store names
- Uniqueness constraints are scoped to non-deleted rows via partial indexes

---

## Planned Features

### External API for Budget Envelope Auto-Allocation

Currently, `allocated_amount` on each `BUDGET_ENVELOPE` is pre-filled from a local constants file (`src/shared/constants/budget-envelope-amounts.ts`) when a new period is opened.

The planned implementation will replace this with a call to an external spend API:
- For each category where `has_budget_envelope = true`, query the API for the last 3 months' actual spend
- Compute the average and use it as the pre-filled `allocated_amount`
- The user can still adjust any envelope via `PATCH /budget-envelopes/:id` after the period is opened

The local constants file will be removed once the external API is integrated.

### Installment Deferral

Currently, deleting an installment expense row cancels that payment — it is removed from the period and the total count of remaining rows decreases.

The planned implementation will add a dedicated "defer" action that postpones a specific installment to a later month rather than cancelling it:
- The existing expense row is soft-deleted from its current budget period
- A new expense row is appended after the last existing installment in the group, inheriting the same `amount`, `categoryId`, `paymentTypeId`, and other fields, with a recalculated `dueDate` and the next available `installmentNumber`
- The target budget period for the new row must already exist; if it does not, the operation is rejected
- `InstallmentGroup.totalInstallments` is incremented to reflect the extended plan (done internally by the deferral action, since the field is read-only on `PATCH /installment-groups/:id`)
- The net effect: the total amount owed is unchanged, the payment is moved to a future month, and the sequence stays contiguous

### Recurring Expense Future Start Date

Currently `startedAt` on a `RECURRING_EXPENSE` is always set to the month of the budget period the expense is entered into — a recurring expense starts immediately.

The planned implementation will allow the user to schedule a recurring expense to begin in a future budget period:
- `startedAt` would accept any month on or after the current period
- The system would skip generating expense rows for periods before `startedAt`
- No schema changes required; only the generation logic and DTO validation need updating

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| `has_budget_envelope` on `CATEGORY` | Separates envelope-tracked categories from regular ones; drives which categories are queried from the external API |
| External API as actual spend source | Avoids double-entry for envelope categories; the remote system is the source of truth for daily spending |
| `RECURRING_EXPENSE` as template | `cancelled_at` stops future generation while preserving historical rows |
| `recurring_expense_id` on `EXPENSE` | Allows tracing any generated row back to its template for editing or cancellation |
| `payment_interval_days` on `INSTALLMENT_GROUP` | Supports any cadence (monthly, bi-weekly, etc.); due dates are calculated, not hardcoded |
| `% of salary` is computed | `expense.amount / SUM(incomes WHERE is_salary)` — derived at query time, always accurate |
| No `salary` field on `BUDGET_PERIOD` | Salary is one or more `INCOME` rows with `is_salary = true`; supports multiple payroll deposits per month |

---

## Glossary

**Budget Period**
A single calendar month identified by `year` and `month` (e.g., March 2026). Every expense, income, and budget envelope belongs to exactly one budget period. At most one non-deleted period can exist for any given `(year, month)` pair.

**Budget Envelope**
A spending plan for a specific category within a budget period. It stores an `allocated_amount` (the cap the user sets) and derives `actual_spend` at query time from an external API. Only categories with `has_budget_envelope = true` participate. At most one non-deleted envelope can exist per `(budget_period_id, category_id)` pair.

**Recurring Expense**
A template for an expense that repeats every month (e.g., Netflix, rent, gym membership). It holds a fixed `amount`, `category`, and `payment_type`. Created implicitly when a user sets `isRecurring: true` on `POST /expenses` — never created directly. When a new budget period is opened, the system auto-generates one `EXPENSE` row per active recurring template. Setting `cancelled_at` stops future generation; already-generated rows are untouched.

**Installment Group**
A record that represents a single purchase split across multiple payments (e.g., a $600 laptop paid over 3 months). It stores the `amount_per_installment`, `total_installments`, `payment_interval_days`, and `first_purchase_date`. The system auto-generates one `EXPENSE` row per installment, each assigned to the correct future budget period with its due date computed as `first_purchase_date + (installment_number - 1) × payment_interval_days`.

**Allocated Amount vs Actual Spend**
Two complementary figures on a budget envelope:
- **Allocated amount** — the planned spending cap for a category in a given period; stored locally and set (or adjusted) when the period is opened.
- **Actual spend** — the real amount spent in that category during the period; never stored — always fetched on demand from the external spend API.
The difference (`allocated_amount − actual_spend`) gives the remaining budget for the envelope.

**% of Salary**
A derived metric that expresses an expense's amount as a percentage of the total salary income for the same period. Computed at query time as:
```text
expense.amount / SUM(income.amount WHERE is_salary = true AND budget_period_id = expense.budget_period_id)
```
It is never stored in the database.
