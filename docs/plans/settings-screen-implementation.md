# Management Screen — Implementation Plan

Status: draft 2 · Last updated: 2026-11-24

The menu entry is titled **Management** (it was "Settings"); the route is `/management`; the code and the file names keep the old name.

Breaks the [Management screen spec](../specs/settings-screen.md) into small tasks. Each task is one pull request to `development`, sized to be reviewed in one sitting. Task IDs start with **ST-** so they don't clash with the Month plan's T- numbers.

Related: [Management spec](../specs/settings-screen.md) · [Month plan](month-screen-implementation.md) · [Backlog](../specs/todo.md) · [API docs](../APIs/api-reference.md) · [Design system](../../DESIGN_SYSTEM.md)

---

## 1. How to work through it

- **One task, one PR**, with a conventional commit title (`feat(settings): …`). A task is done when its "Done when" checks pass and `npm run check`, `npm run build` and `npm run test:cov` are green.
- **Order:** phases run top to bottom. Inside a phase, tasks without a dependency can be done in parallel.
- **Ship read-only first.** Phases 0–2 give a Management screen that lists the four lookups with real data before any form exists. Actions come after.
- **Logic in `src/lib/`, UI in components.** The name rules, the duplicate check and the request builders are pure functions with tests, held to the 90% coverage bar. Components stay thin.
- **Reuse the Month screen's patterns.** The forms use the same shell, field and toast conventions as the income and envelope forms (T-32, T-33); deletes use `ConfirmDeleteModal`; errors go through `describeApiError` (T-07).
- **Every screen task** is checked in light and dark, on desktop and at 390px. `design.pen` has no Management frames, so compare against the income form frames and the existing screens until frames exist.
- **Strings** go in `src/constants/translations.ts`; **colours** only through tokens.
- **Backend gaps stay inside the task they affect.** Each task that depends on a gap (G-7, G-13, G-14, G-15) repeats the gap in its **Backend** line, with what to do now and what changes when it is answered. The gaps are addressed when the task is reached, not before.

---

## 2. Task overview

| ID | Task | Phase | Spec | Depends on | Size | Backend |
|---|---|---|---|---|---|---|
| ST-01 | Lookup error messages (`lib/api-error-message.ts`) | 0 Foundations | S-02, S-04, S-14 | — | S | G-7, G-13 |
| ST-02 | Lookup form rules (`lib/lookup-form.ts`) | 0 | S-02, S-14 | — | S | G-7, G-15 |
| ST-03 | Lookup mutation hooks | 1 Data | S-02 to S-12 | — | M | — |
| ST-04 | Management routes and sidebar submenu | 2 Read-only screen | S-00 | — | S | — |
| ST-05 | Lookup lists | 2 | S-01, S-05, S-09, S-11 | ST-04 | M | — |
| ST-06 | Lookup form panel: rename (Edit) | 3 Actions | S-02, S-06, S-09, S-11, S-14 | ST-01, ST-02, ST-03, ST-05 | M | G-7, G-15 |
| ST-07 | Category flag: Uses envelopes | 3 | S-03 | ST-06 | S | G-14 |
| ST-08 | Payment type flag: Has statement | 3 | S-07 | ST-06 | S | — |
| ST-09 | Delete a lookup | 3 | S-04, S-08, S-10, S-12 | ST-01, ST-03, ST-05 | M | G-13 |
| ST-10 | ~~Appearance tab, and remove the More sheet~~ | 4 Appearance | S-13, A-03 | — | — | Dropped 2026-11-24 |
| ST-11 | Final pass: themes, 390px, accessibility, clean-up | 5 Polish | all | everything | S | G-7 (docs) |

Size: **S** ≈ half a day, **M** ≈ a day.

---

## 3. Tasks

### Phase 0 — Foundations

#### ST-01 Lookup error messages (`lib/api-error-message.ts`)
- **Goal:** map the backend's lookup errors to the messages in spec S-02, S-04 and S-14, using what T-07 built.
- **Includes:** `describeApiError` gains two contexts, `saveLookup` and `deleteLookup`, each taking which lookup it is (category, payment type, bank or store), because the wording names it:
  - `saveLookup`: 409 → kind `duplicateName` with `field: "name"` and "{A category} named '{Name}' already exists."; 404 → "This {item} no longer exists."; 400 and anything else → "Couldn't save the {item}. Try again.";
  - `deleteLookup`: 409 → kind `inUse` and "{Name} is still in use by a recurring bill, or by an expense or envelope in the current or a future month. Change or remove those first." (the "or envelope" part only for categories); 404 → counts as deleted (no error); anything else → "Couldn't delete the {item}. Try again.".
  - Unmatched errors give the generic message, never the raw backend text.
- **Done when:** each row of the spec's two error tables has a test, for all four lookups.
- **Backend:**
  - **G-7** (name uniqueness): the software specification says names are unique ignoring case, the API docs say exact (case-sensitive) match. The 409 message above doesn't depend on the answer, so this task doesn't block. *To address when reached:* ask which rule applies, and if the backend turns out to be exact-match, check that the 409 text still reads right when "grocery" is accepted next to "Grocery".
  - **G-13** (no way to tell whether a lookup is in use): the screen can't say beforehand that an item can't be deleted, so the `inUse` message is the only explanation and it arrives after the confirmation. *To address when reached:* if the backend adds an `inUse` flag or a count of active references per lookup, this message can also be shown before the delete (see ST-09); the wording of the `inUse` message can then name what uses the item.

#### ST-02 Lookup form rules (`lib/lookup-form.ts`)
- **Goal:** the rules of the add and rename form in one tested module, shared by the four lookups.
- **Includes:**
  - a Zod schema for the name (trimmed, not empty) and the two flags (`hasBudgetEnvelope`, `hasStatement`), per lookup;
  - `isDuplicateName(name, items, ignoreId?)`: compares ignoring case and surrounding spaces against the loaded list, skipping the item being edited. Callers run it only for a new or changed name (`nameChanged` helper), never on a save that keeps the name;
  - `buildCreateLookupInput` (always sends every field the API requires on create: the name, and for categories and payment types the flag too, `false` when the switch is off) and `buildUpdateLookupInput` (only changed fields; no change → `null`, so the caller closes without a request), `lookupToFormValues` for the prefill, and `sortLookups` (alphabetical, ignoring case).
- **Done when:** tests cover trimming, the empty name, the duplicate check (case, spaces, the edited item itself), only-changed-fields and the no-change case.
- **Backend:**
  - **G-7** (name uniqueness, see ST-01): the duplicate check here is deliberately stricter than an exact match and is correct under either rule. *To address when reached:* if the backend confirms exact-match, keep the check as it is (the screen blocks "grocery" next to "Grocery" on purpose, S-14) and say so in the spec; if it confirms ignoring case, nothing changes.
  - **G-15** (no maximum length documented for names): the schema sets none. *To address when reached:* if the backend has a column limit, add it to the schema and the error message, and state it in `docs/APIs/`.

### Phase 1 — Data hooks

#### ST-03 Lookup mutation hooks
- **Goal:** create, rename and delete for the four lookups, next to the read hooks T-10 built.
- **Includes:** in `use-categories.ts`, `use-payment-types.ts`, `use-banks.ts` and `use-stores.ts`: `useCreateX`, `useUpdateX` (takes `{ id, ...changedFields }`) and `useDeleteX`, each invalidating the lookup's own query key (`CATEGORIES_QUERY_KEY`, …); `useUpdateX` also invalidates `EXPENSES_QUERY_KEY` (a rename). Tests with `src/test/query-wrapper.tsx`.
- **Done when:** each hook sends the expected request (`POST`, `PATCH` with only the given fields, `DELETE`), invalidates the list on success (and, for an update, the expenses), and leaves everything alone on error.
- **Note:** the Month screen's forms read the lookup keys, so a change shows there after the refetch. Expense rows carry the names they display, so a rename must also invalidate the expenses (`EXPENSES_QUERY_KEY`, the root key the expense mutations already use); otherwise rows cached within their 30-second `staleTime` keep the old name. Creates and deletes need only the lookup's own key: a deleted item stays on past rows as "(deleted)", which the expense data already says.

### Phase 2 — Read-only Management screen

#### ST-04 Management routes and sidebar submenu (S-00)
- **Status: built (2026-11-24), PR #107.** First built as tabs (`?tab=`), then changed the same day to a sidebar submenu, and Appearance was dropped (see ST-10).
- **Includes:**
  - `src/lib/navigation.ts`: `SETTINGS_SECTIONS` (Categories, Payment types, Banks, Stores) as `children` of the Management item, plus `findSettingsSection`, `isNavItemWithinActive`; `getPageTitle` returns "Management" on a section page too (changed after the first build, which showed the section's name);
  - one page per section, `src/app/(app)/management/[section]/page.tsx` (`generateStaticParams` over the four ids, `dynamicParams = false`, so an unknown section is a 404), rendering an empty `SettingsSection` until ST-05;
  - `src/app/(app)/management/page.tsx`: `SettingsIndex`, the list of sections, which is how the phone reaches them;
  - `AppSidebar`: the Management entry is a button that only shows or hides the submenu (arrow, animated height; no navigation). The submenu opens on arriving in a section, and the current section is highlighted; `BottomTabBar` keeps the Management tab current on section pages and `SettingsSection` has a **Back to Management** link on the phone only.
- **Done when:** the S-00 acceptance criteria pass: clicking Management only toggles the submenu, Banks writes `/management/banks` and Back returns to the previous section, and on the phone the Management tab lists the sections.
- **Design:** no `design.pen` frames exist for Management. Compare with the Month screen's header and cards, and add frames afterwards if wanted.

#### ST-05 Lookup lists (S-01, S-05, S-09, S-11)
- **Status: built (2026-11-24), PR #108.** Changed after review of a reference design: each section is an **add card** (name, the flag checkbox for categories and payment types, Save; add is already working, using the ST-03 hook, `isDuplicateName` and the 409 message) above a **table** (Name, flag, Created at, Updated at, row menu) with sortable headers and the Month screen's `Pagination`, 8 rows per page, sorted and paged on the client because the API returns the lists whole (`lib/lookup-table.ts`). This replaces the side panel for **add** planned in ST-06; ST-06 now covers rename only (Edit), and ST-07/ST-08's switches become the checkboxes of the add card (still to add to Edit). The flag shows as a check or dash instead of a badge; `Updated at` is empty when it equals `Created at`.
- **Includes (original scope, see Status):** one `LookupList` used by the four sections: a card with the section's **Add** button in the header (does nothing until ST-06), rows sorted with `sortLookups`, the flag **badge** after the name ("Uses envelopes" / "Has statement", reusing `badge.tsx`), and a row menu with **Edit** and **Delete** (44px touch target on the phone; the entries do nothing until ST-06 and ST-09). States: skeleton rows while loading, an inline error with **Retry**, and "No {items} yet" with an Add button when the list is empty.
- **Done when:** the S-01 acceptance criteria pass (Grocery, Hydro, Transport in that order; badge on the category with envelopes), and each section matches the others in light and dark at 390px.
- **Backend:** none. The lists come whole from `GET /categories`, `/payment-types`, `/banks` and `/stores`.

### Phase 3 — Actions

#### ST-06 Lookup form panel: rename (S-02, S-06, S-09, S-11, S-14)
- **Status: built (2026-11-25).** `LookupFormPanel` (name only; the flags come in ST-07/ST-08) on `DetailsSheet`, which moved to `components/`. `SettingsSection` wires each section to its `useUpdateX` hook through a shared `LookupSection`; the row menu hands its button back so focus returns there on close.
- **Includes:**
  - `LookupFormPanel`: the edit form (Add is the inline card above the table, built in ST-05) on the shell of the income and envelope forms. `DetailsSheet` currently lives in `components/month/`; move it to `components/` in this task, since two screens now use it. Fields per lookup as in the spec (Name\*; the flags arrived in ST-07 and ST-08). **Save** and **Cancel** only;
  - edit from the row menu, prefilled with `lookupToFormValues`; on edit only the changed fields are sent, and saving with no change closes without a request (add already sends every required field, the flags as `false` when off, from the inline card);
  - success: the panel closes and a toast says "{Name} saved" (the add card toasts "{Name} added" itself);
  - **duplicate names (S-14):** `isDuplicateName` runs only for a new or changed name, never on a flag-only save and never against the item being edited. On a match the form first re-reads the list (the cache may be stale) and marks the Name field red only if the match is still there; otherwise it sends the request. A 409 marks the field too and shows the toast from ST-01. The form keeps what was typed;
  - a 404 on edit shows "This {item} no longer exists.", closes the form and refreshes the list; other failures show the generic toast and keep the form open;
  - the form closes when the section changes; one panel at a time.
- **Done when:** the S-02 and S-14 acceptance criteria pass: adding "Nubank" shows it in the list and in the expense form's bank select, a duplicate marks the field and adds nothing (also for " grocery "), and saving an unchanged item sends no request.
- **Backend:**
  - **G-7** (name uniqueness, see ST-01): the pre-send check and the 409 handling are both in this task. *To address when reached:* the answer decides whether the pre-send check is stricter than the server (exact-match) or the same (ignoring case); the behaviour on screen stays the same either way, so only the spec's wording changes.
  - **G-15** (no maximum length documented for names): *To address when reached:* if a limit is confirmed, add it to the schema from ST-02, to the field's hint, and to this form's tests; until then the form accepts any non-empty name and relies on the server's 400 (generic toast).

#### ST-07 Category flag: Uses envelopes (S-03)
- **Status: built (2026-11-25).** The flag is a **checkbox**, as in the add card (ST-05), not a switch, so Add and Edit match. The Edit panel (`LookupFormPanel`) shows it for categories only, prefilled, with the hint; the add card shows the same hint. The panel's field ids differ from the add card's because both are on the page at once. Logic needed no change (`buildUpdateLookupInput` already sends only changed fields). **G-14 resolved** (see Backend). Checked in the browser against the real API: turning it on shows the check and offers the category in + Add → Category.
- **Includes:** the **Uses envelopes** switch (`switch.tsx`) in the category form, off by default on Add, with the hint "Months you open from now on get an envelope for this category. Existing envelopes don't change."; on add `hasBudgetEnvelope` is always sent (`false` when the switch is off, because the API requires it), on edit only when changed; the row's badge and the Month screen's **+ Add → Category** (M-23) update after the list refreshes (same query key, no extra code expected: check it).
- **Done when:** the S-03 acceptance criteria pass: turning it on shows the badge and offers the category in + Add → Category.
- **Backend:**
  - **G-14** (existing envelopes when turned off): the API docs only say that creating an envelope for a category without the flag returns 400; they don't say what happens to envelopes that already exist, nor whether the flag also affects months already open. The hint above assumes existing envelopes are left alone. *To address when reached:* check against the real API (turn the flag off on a category that has an envelope in the current month, then read the envelopes and try the Month screen's Edit budget and Delete on it). If anything differs, reword the hint and the spec's S-03, and if the envelope becomes unusable add a note in the Month screen's envelope details. **Checked 2026-11-25: nothing differs.** The envelope stays, can be edited (200) and deleted (204), and a new envelope for the category is refused (400). The past-month 422 was not exercised.

#### ST-08 Payment type flag: Has statement (S-07)
- **Status: built (2026-11-25).** Same as ST-07: a **checkbox**, not a switch, in the Edit panel (`LookupFormPanel`, payment types only, prefilled, with the hint) and the same hint on the add card. The panel and the add card now pick the flag field from one lookup-to-field map. Logic needed no change. The expense form's Bank asterisk follows the refreshed payment type list (same query key).
- **Includes:** the **Has statement** switch in the payment type form, off by default on Add, with the hint "Expenses paid this way must have a bank. Existing expenses aren't checked again."; on add `hasStatement` is always sent (`false` when off, because the API requires it), on edit only when changed; the expense form's Bank asterisk follows the new setting once the list refreshes (M-14).
- **Done when:** the S-07 acceptance criteria pass: after turning it on for Debit, adding an expense paid with Debit marks Bank as required.
- **Backend:** none. `PATCH /payment-types/:id` takes `hasStatement` and, per the API docs, doesn't re-validate existing expenses (which the hint says). An edit form for an existing expense whose payment type now requires a bank is answered by the server's 400 (the Month screen already maps it, T-29).

#### ST-09 Delete a lookup (S-04, S-08, S-10, S-12)
- **Includes:** **Delete** in the row menu opens `ConfirmDeleteModal`: "Are you sure you want to delete the {category | payment type | bank | store} {name}?"; one `DELETE` per confirm with the pending spinner; success removes the row and toasts "{Name} deleted"; a 409 closes the modal and toasts the in-use message from ST-01, leaving the row; a 404 counts as deleted (refresh, no toast); other failures toast "Couldn't delete the {item}. Try again." and keep the row.
- **Done when:** the S-04 acceptance criteria pass: an unused bank leaves the list and the expense form's bank select; a category used by a current-month expense shows the in-use message and stays. Checked against the real API for each of the four lookups, and the test items removed afterwards.
- **Backend:**
  - **G-13** (no way to tell whether a lookup is in use): the backend refuses with 409 only after the user has confirmed, and the response doesn't say what uses the item. The UX brief's principle 5 ("lookups in use say so before a delete is attempted") can't be met. *To address when reached:* ask for an `inUse` flag, or the count of active references (recurring bills, expenses, and for categories envelopes), on each lookup. When it lands: disable **Delete** in the row menu with the reason, keep the 409 handling for the stale case, and add the new field to the types (T-01) and to the list rows of ST-05. Until then, the screen keeps the confirmation-then-message flow above.

### Phase 4 — Appearance

#### ST-10 Appearance — dropped (S-13, A-03)
- **Decided 2026-11-24:** no Appearance section. The theme switch stays at the bottom of the sidebar (`ThemeToggle`) and in the phone's More sheet, so nothing in `AppSidebar`, `BottomTabBar`, `MORE_NAV_ITEMS` or the theme strings is removed. Phase 4 is empty.

### Phase 5 — Polish

#### ST-11 Final pass
- **Includes:**
  - keyboard paths: the sidebar submenu, the row menu, the form panel with focus trap, Escape and focus return, the delete modal;
  - the empty, loading and error states of the four sections in light and dark at 390px, with nothing scrolling sideways;
  - unused translations removed;
  - docs aligned: `docs/software_specification.md` line 141 still says an expense can't be updated in a past month (resolved 2026-11-10, BE-3); the case-sensitivity of lookup names (G-7) stated the same way in the software specification and the API docs; todo.md's feature map statuses updated, and the plan and spec statuses set to done;
  - coverage thresholds raised if they went up.
- **Done when:** the checklist is complete and `check`, `build` and `test:cov` pass.
- **Backend:** **G-7** (name uniqueness) — only the documentation part: once answered, make the software specification and the API docs say the same thing. No code depends on it at this point.

---

## 4. Waiting on the backend

These don't block any task, but each needs follow-up work once resolved. Each affected task also lists its gap in its own **Backend** line, with what to do now and what changes when it is resolved. They are addressed when the task is reached.

| Item | Affects | What changes when it lands |
|---|---|---|
| G-7 name uniqueness (ignoring case or exact) | ST-01, ST-02, ST-06, ST-11 | Spec wording and docs; the screen already behaves the same under either rule |
| G-13 no way to tell whether a lookup is in use | ST-01, ST-09 | Disable Delete with the reason before the attempt; keep the 409 handling for stale lists |
| ~~G-14~~ existing envelopes when "Uses envelopes" is turned off | ST-07 | Resolved 2026-11-25: existing envelopes are left alone; no change |
| G-15 no maximum length for names | ST-02, ST-06 | Add the limit to the schema, hint and tests |

## 5. Open questions

Three decisions in section 7 of the [spec](../specs/settings-screen.md) (panel for edit, add inline above the table, flags in the form only, case-insensitive name check) are proposals until confirmed. The plan follows them as written; if one changes, ST-05 or ST-06 move. Two were decided on 2026-11-24: sections are a sidebar submenu with one page each, and there is no Appearance section.
