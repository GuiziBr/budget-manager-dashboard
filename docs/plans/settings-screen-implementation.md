# Settings Screen — Implementation Plan

Status: draft 1 · Last updated: 2026-11-17

Breaks the [Settings screen spec](../specs/settings-screen.md) into small tasks. Each task is one pull request to `development`, sized to be reviewed in one sitting. Task IDs start with **ST-** so they don't clash with the Month plan's T- numbers.

Related: [Settings spec](../specs/settings-screen.md) · [Month plan](month-screen-implementation.md) · [Backlog](../specs/todo.md) · [API docs](../APIs/api-reference.md) · [Design system](../../DESIGN_SYSTEM.md)

---

## 1. How to work through it

- **One task, one PR**, with a conventional commit title (`feat(settings): …`). A task is done when its "Done when" checks pass and `npm run check`, `npm run build` and `npm run test:cov` are green.
- **Order:** phases run top to bottom. Inside a phase, tasks without a dependency can be done in parallel.
- **Ship read-only first.** Phases 0–2 give a Settings screen that lists the four lookups with real data before any form exists. Actions come after.
- **Logic in `src/lib/`, UI in components.** The name rules, the duplicate check and the request builders are pure functions with tests, held to the 90% coverage bar. Components stay thin.
- **Reuse the Month screen's patterns.** The forms use the same shell, field and toast conventions as the income and envelope forms (T-32, T-33); deletes use `ConfirmDeleteModal`; errors go through `describeApiError` (T-07).
- **Every screen task** is checked in light and dark, on desktop and at 390px. `design.pen` has no Settings frames, so compare against the income form frames and the existing screens until frames exist.
- **Strings** go in `src/constants/translations.ts`; **colours** only through tokens.
- **Backend gaps stay inside the task they affect.** Each task that depends on a gap (G-7, G-13, G-14, G-15) repeats the gap in its **Backend** line, with what to do now and what changes when it is answered. The gaps are addressed when the task is reached, not before.

---

## 2. Task overview

| ID | Task | Phase | Spec | Depends on | Size | Backend |
|---|---|---|---|---|---|---|
| ST-01 | Lookup error messages (`lib/api-error-message.ts`) | 0 Foundations | S-02, S-04, S-14 | — | S | G-7, G-13 |
| ST-02 | Lookup form rules (`lib/lookup-form.ts`) | 0 | S-02, S-14 | — | S | G-7, G-15 |
| ST-03 | Lookup mutation hooks | 1 Data | S-02 to S-12 | — | M | — |
| ST-04 | Settings route and tabs | 2 Read-only screen | S-00 | — | S | — |
| ST-05 | Lookup lists | 2 | S-01, S-05, S-09, S-11 | ST-04 | M | — |
| ST-06 | Lookup form panel: add and rename | 3 Actions | S-02, S-06, S-09, S-11, S-14 | ST-01, ST-02, ST-03, ST-05 | M | G-7, G-15 |
| ST-07 | Category flag: Uses envelopes | 3 | S-03 | ST-06 | S | G-14 |
| ST-08 | Payment type flag: Requires a bank | 3 | S-07 | ST-06 | S | — |
| ST-09 | Delete a lookup | 3 | S-04, S-08, S-10, S-12 | ST-01, ST-03, ST-05 | M | G-13 |
| ST-10 | Appearance tab, and remove the More sheet | 4 Appearance | S-13, A-03 | ST-04 | M | — |
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
  - `isDuplicateName(name, items, ignoreId?)`: compares ignoring case and surrounding spaces against the loaded list, skipping the item being edited;
  - `buildCreateLookupInput` and `buildUpdateLookupInput` (only changed fields; no change → `null`, so the caller closes without a request), `lookupToFormValues` for the prefill, and `sortLookups` (alphabetical, ignoring case).
- **Done when:** tests cover trimming, the empty name, the duplicate check (case, spaces, the edited item itself), only-changed-fields and the no-change case.
- **Backend:**
  - **G-7** (name uniqueness, see ST-01): the duplicate check here is deliberately stricter than an exact match and is correct under either rule. *To address when reached:* if the backend confirms exact-match, keep the check as it is (the screen blocks "grocery" next to "Grocery" on purpose, S-14) and say so in the spec; if it confirms ignoring case, nothing changes.
  - **G-15** (no maximum length documented for names): the schema sets none. *To address when reached:* if the backend has a column limit, add it to the schema and the error message, and state it in `docs/APIs/`.

### Phase 1 — Data hooks

#### ST-03 Lookup mutation hooks
- **Goal:** create, rename and delete for the four lookups, next to the read hooks T-10 built.
- **Includes:** in `use-categories.ts`, `use-payment-types.ts`, `use-banks.ts` and `use-stores.ts`: `useCreateX`, `useUpdateX` (takes `{ id, ...changedFields }`) and `useDeleteX`, each invalidating the lookup's own query key (`CATEGORIES_QUERY_KEY`, …). Tests with `src/test/query-wrapper.tsx`.
- **Done when:** each hook sends the expected request (`POST`, `PATCH` with only the given fields, `DELETE`), invalidates the list on success, and leaves it alone on error.
- **Note:** the Month screen reads the same keys, so a change shows in the expense form and rows after the refetch. No other query needs invalidating: expenses carry their own names, and renaming an item shows the new name on past rows once their data is read again.

### Phase 2 — Read-only Settings screen

#### ST-04 Settings route and tabs (S-00)
- **Includes:** `src/app/(app)/settings/page.tsx` replacing the "Coming soon" state; a `SettingsScreen` with the `tabs.tsx` primitive: **Categories**, **Payment types**, **Banks**, **Stores**, **Appearance**; the selected tab read from and written to `?tab=` (unknown value → Categories; each change adds a history entry); the tab strip scrolls sideways on the phone. The panels of the tabs are empty placeholders until ST-05 and ST-10.
- **Done when:** the S-00 acceptance criteria pass: no `tab` shows Categories, tapping Banks writes `?tab=banks`, and Back returns to the previous tab.
- **Design:** no `design.pen` frames exist for Settings. Compare with the Month screen's header and cards, and add frames afterwards if wanted.

#### ST-05 Lookup lists (S-01, S-05, S-09, S-11)
- **Includes:** one `LookupList` used by the four tabs: a card with the tab's **Add** button in the header (does nothing until ST-06), rows sorted with `sortLookups`, the flag **badge** after the name ("Uses envelopes" / "Requires a bank", reusing `badge.tsx`), and a row menu with **Edit** and **Delete** (44px touch target on the phone; the entries do nothing until ST-06 and ST-09). States: skeleton rows while loading, an inline error with **Retry**, and "No {items} yet" with an Add button when the list is empty.
- **Done when:** the S-01 acceptance criteria pass (Grocery, Hydro, Transport in that order; badge on the category with envelopes), and each tab matches the others in light and dark at 390px.
- **Backend:** none. The lists come whole from `GET /categories`, `/payment-types`, `/banks` and `/stores`.

### Phase 3 — Actions

#### ST-06 Lookup form panel: add and rename (S-02, S-06, S-09, S-11, S-14)
- **Includes:**
  - `LookupFormPanel`: the add and edit form on the shell of the income and envelope forms. `DetailsSheet` currently lives in `components/month/`; move it to `components/` in this task, since two screens now use it. Fields per lookup as in the spec (Name\*; the two switches arrive in ST-07 and ST-08). **Save** and **Cancel** only;
  - add from the tab's Add button (and the empty state); edit from the row menu, prefilled with `lookupToFormValues`; only changed fields are sent, and saving with no change closes without a request;
  - success: the panel closes and a toast says "{Name} added" or "{Name} saved";
  - **duplicate names (S-14):** `isDuplicateName` marks the Name field red before sending; a 409 does the same and shows the toast from ST-01. The form keeps what was typed;
  - a 404 on edit shows "This {item} no longer exists.", closes the form and refreshes the list; other failures show the generic toast and keep the form open;
  - the form closes when the tab changes; one panel at a time.
- **Done when:** the S-02 and S-14 acceptance criteria pass: adding "Nubank" shows it in the list and in the expense form's bank select, a duplicate marks the field and adds nothing (also for " grocery "), and saving an unchanged item sends no request.
- **Backend:**
  - **G-7** (name uniqueness, see ST-01): the pre-send check and the 409 handling are both in this task. *To address when reached:* the answer decides whether the pre-send check is stricter than the server (exact-match) or the same (ignoring case); the behaviour on screen stays the same either way, so only the spec's wording changes.
  - **G-15** (no maximum length documented for names): *To address when reached:* if a limit is confirmed, add it to the schema from ST-02, to the field's hint, and to this form's tests; until then the form accepts any non-empty name and relies on the server's 400 (generic toast).

#### ST-07 Category flag: Uses envelopes (S-03)
- **Includes:** the **Uses envelopes** switch (`switch.tsx`) in the category form, off by default on Add, with the hint "Months you open from now on get an envelope for this category. Existing envelopes don't change."; the flag sent only when changed; the row's badge and the Month screen's **+ Add → Category** (M-23) update after the list refreshes (same query key, no extra code expected: check it).
- **Done when:** the S-03 acceptance criteria pass: turning it on shows the badge and offers the category in + Add → Category.
- **Backend:**
  - **G-14** (existing envelopes when turned off): the API docs only say that creating an envelope for a category without the flag returns 400; they don't say what happens to envelopes that already exist, nor whether the flag also affects months already open. The hint above assumes existing envelopes are left alone. *To address when reached:* check against the real API (turn the flag off on a category that has an envelope in the current month, then read the envelopes and try the Month screen's Edit budget and Delete on it). If anything differs, reword the hint and the spec's S-03, and if the envelope becomes unusable add a note in the Month screen's envelope details.

#### ST-08 Payment type flag: Requires a bank (S-07)
- **Includes:** the **Requires a bank** switch in the payment type form, off by default on Add, with the hint "Expenses paid this way must have a bank. Existing expenses aren't checked again."; the flag sent only when changed; the expense form's Bank asterisk follows the new setting once the list refreshes (M-14).
- **Done when:** the S-07 acceptance criteria pass: after turning it on for Debit, adding an expense paid with Debit marks Bank as required.
- **Backend:** none. `PATCH /payment-types/:id` takes `hasStatement` and, per the API docs, doesn't re-validate existing expenses (which the hint says). An edit form for an existing expense whose payment type now requires a bank is answered by the server's 400 (the Month screen already maps it, T-29).

#### ST-09 Delete a lookup (S-04, S-08, S-10, S-12)
- **Includes:** **Delete** in the row menu opens `ConfirmDeleteModal`: "Are you sure you want to delete the {category | payment type | bank | store} {name}?"; one `DELETE` per confirm with the pending spinner; success removes the row and toasts "{Name} deleted"; a 409 closes the modal and toasts the in-use message from ST-01, leaving the row; a 404 counts as deleted (refresh, no toast); other failures toast "Couldn't delete the {item}. Try again." and keep the row.
- **Done when:** the S-04 acceptance criteria pass: an unused bank leaves the list and the expense form's bank select; a category used by a current-month expense shows the in-use message and stays. Checked against the real API for each of the four lookups, and the test items removed afterwards.
- **Backend:**
  - **G-13** (no way to tell whether a lookup is in use): the backend refuses with 409 only after the user has confirmed, and the response doesn't say what uses the item. The UX brief's principle 5 ("lookups in use say so before a delete is attempted") can't be met. *To address when reached:* ask for an `inUse` flag, or the count of active references (recurring bills, expenses, and for categories envelopes), on each lookup. When it lands: disable **Delete** in the row menu with the reason, keep the 409 handling for the stale case, and add the new field to the types (T-01) and to the list rows of ST-05. Until then, the screen keeps the confirmation-then-message flow above.

### Phase 4 — Appearance

#### ST-10 Appearance tab, and remove the More sheet (S-13, A-03)
- **Includes:**
  - the **Appearance** tab with the light / dark choice, using `useTheme` (`theme`, `toggleTheme`) and the existing storage in `lib/theme.ts`; applied at once and kept across reloads as today;
  - remove the theme toggles from `AppSidebar` (`ThemeToggle`) and from `BottomTabBar` (the More sheet and its button);
  - clean up the navigation: `MORE_NAV_ITEMS` and `isMoreTabActive` in `src/lib/navigation.ts`, the `navigation.tabs.more` and `theme.switchTo*` strings that no longer have a user (keep what the Appearance tab uses), and the tests that covered them.
- **Done when:** the S-13 acceptance criteria pass: picking dark makes the whole app dark and it stays dark after a reload; the phone's tab bar shows three tabs and no More button; the sidebar has no theme toggle. The navigation and tab bar tests are updated.
- **Note:** the theme is only two values (`light` | `dark`, default dark), so the tab offers two choices, not "system". Adding a system option would be a separate decision.
- **Backend:** none.

### Phase 5 — Polish

#### ST-11 Final pass
- **Includes:**
  - keyboard paths: the tabs (arrow keys), the row menu, the form panel with focus trap, Escape and focus return, the delete modal;
  - the empty, loading and error states of the four tabs in light and dark at 390px, with nothing scrolling sideways except the tab strip;
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
| G-14 existing envelopes when "Uses envelopes" is turned off | ST-07 | Reword the hint and S-03 if the real behaviour differs |
| G-15 no maximum length for names | ST-02, ST-06 | Add the limit to the schema, hint and tests |

## 5. Open questions

The four decisions in section 7 of the [spec](../specs/settings-screen.md) (panel for add and edit, flags in the form only, Appearance as a fifth tab, case-insensitive name check) are proposals until confirmed. The plan follows them as written; if one changes, ST-05, ST-06 or ST-10 are the tasks that move.
