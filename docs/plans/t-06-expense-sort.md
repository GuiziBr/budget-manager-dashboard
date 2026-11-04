# T-06 — Sort params for the expenses API

Status: draft · Last updated: 2026-11-03 (BE-4 documented in the API docs)

Detailed plan for task **T-06** of the [Month screen implementation plan](month-screen-implementation.md). One pull request, size S.

Related: [Month spec](../specs/month-screen.md) (M-06) · [Expense API](../APIs/expense.md) · [Backend requirements](../specs/t-06-backend-requirements.md) (BE-4) · [T-05 plan](t-05-month-rows.md)

---

## 1. Branch and PR

- Branch `feat/expense-sort` from `development` (T-05 is merged; the types T-06 needs, `ExpenseSortBy`, `ExpenseListParams` and `SortOrder`, are already in `src/types/`).
- Commit: `feat(month): add expense sort params`.

## 2. Check against the API docs

[expense.md](../APIs/expense.md) as of 2026-11-03 supports every sortable header in M-06 (Item, Category, Payment, Due, Paid, Amount):

- `sortBy` accepts `description`, `categoryName`, `paymentTypeName`, `amount`, `purchasedAt`, `dueAt`, `paidAt`, `installmentNumber`, `createdAt`, `updatedAt`; `sortOrder` is `asc` or `desc`; the default is `createdAt` `desc`.
- Nulls sort **last in both directions**, so a missing due date or an unpaid row ends up last, as M-06's acceptance criteria require. The frontend does nothing for this.
- Ties are broken by `id`, also descending with `desc`, so paging is stable. Equal amounts therefore appear in id order, not in creation order; this is expected.
- An unknown `sortBy` or `sortOrder` is a `400`, so the mapping must never send a key the backend doesn't have.

`description`, `categoryName` and `paymentTypeName` sort case-insensitively, `amount` numerically, and the sort applies to the whole set before paging (BE-4, see the [backend requirements](../specs/t-06-backend-requirements.md)). The # column (row type) is not sortable by design.

Two small gaps in the existing plan, settled here:

| Gap | Decision |
|---|---|
| T-06 says "reading/writing the sort in the address", while T-21 also says "remembered on this device" | T-06 owns the **pure** parsing and serialising (one parser for both the address and the stored value). T-21 owns the actual `useSearchParams` and `localStorage` access, with try/catch |
| The address format isn't defined | `?period=2026-11&page=1&sortBy=dueAt&sortOrder=asc`, the API's own names. Both params are left out at the default order |

## 3. Scope

**In:** `src/lib/expense-sort.ts` and `src/lib/expense-sort.test.ts`. Pure functions: no React, no `window`, no `localStorage`, no fetching.

**Out:** the hook (T-12 only receives the result), the header buttons (T-21), the address and storage access (T-21), the BE-4 columns.

## 4. Design

Sort state is either `null` (the default order) or a column and a direction. Columns are named after the table headers, not the API keys, so the UI never touches an API key.

```ts
type SortColumn = "item" | "category" | "payment" | "due" | "paid" | "amount"
type SortState = { column: SortColumn; order: SortOrder } | null
```

| Export | Behaviour |
|---|---|
| `SORT_KEYS` | Header → `sortBy`: `item` → `description`, `category` → `categoryName`, `payment` → `paymentTypeName`, `due` → `dueAt`, `paid` → `paidAt`, `amount` → `amount`. The only place the mapping lives; includes the two BE-4 entries |
| `DEFAULT_SORT_PARAMS` | `{ sortBy: "createdAt", sortOrder: "desc" }` |
| `toSortParams(state)` | The two API params for `GET /expenses`. `null` gives the default, sent explicitly so the request doesn't depend on the server's default. Used by T-12 and its query key |
| `nextSort(state, column)` | The three-state cycle: a column that isn't active starts ascending; ascending → descending; descending → `null` (default). Clicking another column while one is active starts the new one ascending |
| `sortIndicator(state, column)` | `"↑"`, `"↓"` or `""`, the values `SortableHeader` already takes |
| `parseSort(sortBy, sortOrder)` | The inverse of `toSortParams`, for the address and the stored value. Anything not in `SORT_KEYS` or not `asc` / `desc` (including `createdAt`, a missing order, or garbage) gives `null`, so a hand-edited or stale address falls back to the default, like an invalid `period` |
| `toSortSearch(state)` | `{ sortBy, sortOrder }` for the address, or `{}` for `null`, ready for `withQuery` / `buildQuery` |

### Decisions

- **No row sorting.** Nothing here sorts an array (spec M-06): it only produces params.
- **Third click returns to the default**, not to "ascending again" (M-06).
- **One parser** for the address and `localStorage`; T-21 stores `{ sortBy, sortOrder }` and reads it back through `parseSort`.
- **Precedence** (T-21): the address first, then the remembered sort, then the default. The third click removes the remembered sort instead of saving the default.
- **API keys are never typed as free strings**: the mapping is typed against `ExpenseSortBy`, so a key the backend lacks doesn't compile.
- **Page reset is not here.** "Back to page 1 on a sort change" is the hook's job (T-12 / T-21); `nextSort` knows nothing about pages.
- **No strings** in the module.

## 5. Tests

`src/lib/expense-sort.test.ts`, at or above the 90% bar for `src/lib/`.

| Case | Expected |
|---|---|
| `toSortParams` for Item, Category, Payment, Due, Paid, Amount, ascending and descending | `description`, `categoryName`, `paymentTypeName`, `dueAt`, `paidAt`, `amount` with the order |
| `toSortParams(null)` | `createdAt` `desc` |
| `nextSort(null, "due")` | due ascending |
| `nextSort` of due ascending, same column | due descending |
| `nextSort` of due descending, same column | `null` (third click resets) |
| `nextSort` of due descending, other column | the other column ascending |
| Full cycle on each of the six columns | ascending, descending, default |
| `sortIndicator` | `↑` / `↓` on the active column, `""` on the others and for `null` |
| `parseSort("dueAt", "asc")` | due ascending; round trip with `toSortParams` for all 12 combinations |
| `parseSort` with an unknown key, `createdAt`, an invalid order, `null`, `undefined`, an empty string | `null` |
| `toSortSearch` | the two params for a sort, `{}` for `null`, and `withQuery` leaves them out then |
| Inputs | not mutated |

## 6. Done when

- The tests pass and the module is at or above the 90% bar.
- `npm run check`, `npm run build` and `npm run test:cov` are green.
- The module imports no React and reads no `window` or storage.

## 7. How later tasks use it

| Task | Use |
|---|---|
| T-12 | `useMonthExpensesPage(periodId, page, sort)` puts `toSortParams(sort)` in the request and the query key |
| T-21 | Reads the sort from the address, then `localStorage`, via `parseSort`; header click calls `nextSort`, resets the page, writes `toSortSearch` to the address; passes `sortIndicator` to `SortableHeader` |
| T-22 | The phone list has no headers and uses `null` (default order) |

## 8. Backend

**BE-4 is delivered and documented** in [expense.md](../APIs/expense.md): `categoryName` and `paymentTypeName` are in the mapping (`SORT_KEYS`) and in `ExpenseSortBy`. T-21 turns the Category and Payment labels into sort headers. If an environment runs a backend without BE-4, those two sorts return `400`.

The `description` sort is now case-insensitive too, `amount` sorts numerically, and every key sorts the whole set before paging, so nothing special is needed in the frontend.
