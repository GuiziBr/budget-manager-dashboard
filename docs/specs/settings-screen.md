# Management Screen — Functional Specification

Status: draft 2 · Last updated: 2026-11-24

The Management screen is where the budget owner maintains the lists the rest of the app draws from (categories, payment types, banks and stores). It is used rarely, but without it a new bank or store can't be added from the app.

The forms and confirmations opened from this screen are specified here, because they are only reachable from it.

The menu entry is titled **Management** (it was "Settings"). The route is `/management` (it was `/settings`); the code and these file names keep the old name.

Related: [UX brief](../ui/ux-brief.md) · [Software specification](../software_specification.md) · [API docs](../APIs/api-reference.md) · [Month spec](month-screen.md) · [Backlog](todo.md) · [Design system](../../DESIGN_SYSTEM.md)

---

## 1. Feature map

Priority: **Must** = needed to replace the spreadsheet. **Should** = valuable, can follow shortly after.
Status: **Ready** = the backend supports it today. **Gap** = needs a backend change or an answer (section 6).

Feature IDs keep the numbering of [todo.md](todo.md) (S-01 to S-14), so the backlog and this spec point at the same things.

| ID | Feature | Priority | Status |
|---|---|---|---|
| **Screen** | | | |
| S-00 | Management submenu: Categories, Payment types, Banks, Stores | Must | Ready |
| **Categories** | | | |
| S-01 | List categories, showing which use envelopes | Must | Ready |
| S-02 | Add and rename a category | Must | Ready |
| S-03 | Turn "Uses envelopes" on or off | Must | Ready |
| S-04 | Delete a category | Must | Ready (see G-13) |
| **Payment types** | | | |
| S-05 | List payment types, showing which have a statement | Must | Ready |
| S-06 | Add and rename a payment type | Must | Ready |
| S-07 | Turn "Has statement" on or off | Must | Ready |
| S-08 | Delete a payment type | Must | Ready (see G-13) |
| **Banks** | | | |
| S-09 | List, add and rename banks | Must | Ready |
| S-10 | Delete a bank | Must | Ready (see G-13) |
| **Stores** | | | |
| S-11 | List, add and rename stores | Must | Ready |
| S-12 | Delete a store | Must | Ready (see G-13) |
| **Appearance** | | | |
| S-13 | ~~Choose light or dark theme in Management~~ | — | Dropped (2026-11-24): the theme switch stays at the bottom of the sidebar, and in the More sheet on the phone |
| **Rules across the screen** | | | |
| S-14 | Duplicate names are rejected with a clear message | Must | Ready (see G-7) |

---

## 2. Definitions

| Term | Meaning |
|---|---|
| **Lookup** | One of the four lists: category, payment type, bank, store. Each item has a name; categories also have **Uses envelopes** and payment types also have **Has statement** |
| **Uses envelopes** | The category's `hasBudgetEnvelope`. Months opened from now on get an envelope for it, and envelopes can be added for it (M-23) |
| **Has statement** | The payment type's `hasStatement` (it was labelled "Requires a bank"). An expense with this payment type must have a bank (M-14) |
| **Actively referenced** | What the backend checks before a delete: a recurring bill that isn't cancelled (or is cancelled on or after the first day of the current UTC month), or an expense in the current or a future month. For categories, also an envelope in the current or a future month. References from past months **don't** block a delete |
| **Deleted lookup** | A lookup that was deleted. It stays on the past expenses that used it, shown as "Name (deleted)" (M-05, M-17), but can't be picked for new ones |

---

## 3. Features

### Screen

#### S-00 Management submenu

*As the budget owner, I want one place for every list, so I don't hunt through the app to add a bank.*

**How it works**
1. **Management** in the sidebar has a submenu: **Categories**, **Payment types**, **Banks**, **Stores**. It is shown while any Management page is open and hidden elsewhere. The current section is highlighted.
2. Each section is its own page, so a link and the back button return to it: `/management/categories`, `/management/payment-types`, `/management/banks`, `/management/stores`. An unknown section is a 404.
3. Clicking **Management** in the sidebar only shows or hides the submenu (an arrow beside it points up when open, down when closed, and the height animates); it doesn't open a page. The submenu opens by itself when you arrive in a section, and can be collapsed by hand. The page title stays "Management" on every section; the section's name is the heading of its add card.
4. The phone has no sidebar. The **Management** tab opens `/management`, a list of the four sections; each section page has a **Back to Management** link at the top (hidden on desktop).
5. Each section has the same layout (S-01): a header with the section's **Add** button and a list below it, inside one card.
6. There is no Appearance section: the theme switch stays where it is (S-13 dropped).

**Acceptance criteria**
- *Given* I click Management in the sidebar, *then* the submenu opens or closes and the page doesn't change.
- *Given* I click Banks in the submenu, *then* the address reads `/management/banks` and Back returns to the previous section.
- *Given* the phone, *when* I tap the Management tab, *then* I see the four sections, and opening one shows a link back to the list.

### Lookup lists (S-01, S-05, S-09, S-11)

#### The list

*As the budget owner, I want to see every item of a list at a glance.*

**How it works**
- Rows are sorted alphabetically (ignoring case). The API returns each list whole, and the table paginates it at 8 rows per page.
- Each row shows the name, and for categories and payment types a flag column ("Uses envelopes", "Has statement") with a check when it is on and a dash when not. Rows also show **Created at** and **Updated at** (blank if never changed). Headers sort; the table shows 8 rows per page.
- Each row has a menu with **Edit** and **Delete**. On the phone the whole row isn't tappable; the menu button has a 44px touch target.
- Loading shows skeleton rows. A failed load shows an inline error with **Retry**. An empty list shows "No {items} yet" with an Add button.

**Acceptance criteria**
- *Given* categories Transport, Grocery and Hydro, *then* they are listed Grocery, Hydro, Transport.
- *Given* Grocery uses envelopes, *then* its row shows the "Uses envelopes" badge and Transport's doesn't.

### Add and rename (S-02, S-06, S-09, S-11)

*As the budget owner, I want to add an item or fix its name.*

**How it works**
1. **Add** is the inline card above the table: the name, the flag checkbox for categories and payment types, and **Save** (react-hook-form + Zod, a red border with the reason kept for screen readers). It clears after a successful save, unless the fields were edited while the save was pending.
2. **Edit** opens a form in a side panel on desktop and a full-height sheet on the phone, the same shell as the income and envelope forms, with **Save** and **Cancel**, prefilled and titled "Edit {item}". Only the changed fields are sent; saving with no change closes without a request.
3. Fields:

| Lookup | Fields |
|---|---|
| Category | Name\*, **Uses envelopes** (switch, off by default) |
| Payment type | Name\*, **Has statement** (checkbox in the add card, off by default) |
| Bank | Name\* |
| Store | Name\* |

4. On success the form closes, the list refreshes and a toast says "{Name} added" or "{Name} saved".
5. **What is sent.** Add always sends every field the API requires on create: the name, and for categories and payment types the flag too, `false` when the switch is off (`hasBudgetEnvelope` and `hasStatement` are required on `POST`). Edit sends only the fields that changed.

**Rules**
- The name is trimmed and can't be empty. The API documents no maximum length; the form follows the API.
- Renaming changes the name wherever the item is shown, including past expenses, because expenses show the item's current name.
- The edit panel closes when the section changes (it is a different page). Only one panel is open at a time.
- Finish & add another isn't offered: items are added rarely.

**When something goes wrong**

| Situation | What you see |
|---|---|
| The name is already used (409, S-14) | The Name field turns red and a toast says "{A category} named '{Name}' already exists." The form stays open with what was typed |
| The item was deleted meanwhile (404 on edit) | "This {item} no longer exists." The form closes and the list refreshes |
| Anything else | The generic toast "Couldn't save the {item}. Try again." The form stays open |

**Acceptance criteria**
- *Given* the Banks tab, *when* I add "Nubank", *then* it appears in the list and in the bank select of the expense form.
- *Given* "Grocery" exists, *when* I add a category called "Grocery", *then* the Name field is marked and nothing is added.
- *Given* an item, *when* I open Edit and save without changes, *then* no request is sent.

### Flags (S-03, S-07)

#### S-03 Uses envelopes

*As the budget owner, I want to choose which categories get a monthly envelope.*

- The switch is in the category form (Add and Edit).
- A hint under it reads: "Months you open from now on get an envelope for this category. Existing envelopes don't change."
- Turning it **on** makes the category appear in **+ Add → Category** of the Month screen (M-23) for current and future months, where an envelope can be added by hand.
- Turning it **off** doesn't remove envelopes that already exist. They can be deleted from the Month screen (M-24) only in the current and future months: the backend refuses to change or delete envelopes of past months (422, M-25).

**Acceptance criteria**
- *Given* a category without envelopes, *when* I turn the switch on and save, *then* its row shows the "Uses envelopes" badge and the category is offered in + Add → Category.

#### S-07 Has statement

*As the budget owner, I want payment types like credit cards to demand a bank.*

- The switch is in the payment type form. A hint reads: "Expenses paid this way must have a bank. Existing expenses aren't checked again."
- The expense form uses the new setting as soon as the list is refreshed (the Bank field's asterisk follows the chosen payment type, M-14).

**Acceptance criteria**
- *Given* "Debit" doesn't have a statement, *when* I turn the switch on, *then* adding an expense paid with Debit marks Bank as required.

### Delete (S-04, S-08, S-10, S-12)

*As the budget owner, I want to remove items I no longer use.*

**How it works**
1. **Delete** in the row's menu opens `ConfirmDeleteModal`: "Are you sure you want to delete the {category | payment type | bank | store} {name}?"
2. Confirming sends `DELETE`. On success the row disappears and a toast says "{Name} deleted".

**Rules**
- The backend refuses while the item is actively referenced (section 2). The screen can't tell beforehand which items are in use (G-13), so the refusal arrives after the confirmation.
- Past expenses keep the item and show "(deleted)" (M-05).

**When something goes wrong**

| Situation | What you see |
|---|---|
| Still in use (409) | The modal closes and a toast says "{Name} is still in use by a recurring bill, or by an expense or envelope in the current or a future month. Change or remove those first." (categories name envelopes; the others don't) |
| Already deleted (404) | Counts as deleted: the list refreshes, no error |
| Anything else | The generic toast "Couldn't delete the {item}. Try again." and the row stays |

**Acceptance criteria**
- *Given* an unused bank, *when* I confirm the delete, *then* it leaves the list and the expense form's bank select.
- *Given* a category used by a current-month expense, *when* I confirm the delete, *then* the in-use message shows and the category stays.

### Appearance (S-13) — dropped

Decided 2026-11-24: the theme switch stays at the bottom of the sidebar, and in the **More** sheet on the phone. There is no Appearance section, and the More sheet stays (A-03 is dropped with it).

### S-14 Duplicate names

- The backend answers 409 for a duplicate. The screen shows the message of the Add and rename table.
- **Before sending** a new or changed name, the form compares it, ignoring case and surrounding spaces, with the other items already loaded, and marks the field at once. The item being edited is not compared with itself, and a save that keeps the name unchanged (a flag-only edit, for example) doesn't run the check. This is stricter than an exact match, and safe either way: if the backend turns out to be case-sensitive (G-7), "grocery" next to "Grocery" can exist, and only new or changed names are blocked by the screen, which is the intended behaviour for a one-person budget.
- **A local match is confirmed before it blocks.** The list on screen may be stale (another client may have deleted or renamed the item). On a match, the form first re-reads the list; it marks the field only if the match is still there, and otherwise sends the request.
- The server's answer always wins: a 409 marks the field even when the list showed no match.

**Acceptance criteria**
- *Given* "Grocery" exists, *when* I type " grocery " in a new category, *then* the field turns red before I save.

---

## 4. Rules across the screen

- **Editing is always allowed.** There are no read-only states on this screen.
- **Strings** live in `src/constants/translations.ts`; colours only through tokens.
- **Cache.** A change invalidates the lookup's query key, so the Month screen's forms show it without a reload. A **rename** also invalidates the expenses (`EXPENSES_QUERY_KEY`), because each expense row carries the names it shows; without that, rows already cached would keep the old name until they were read again. The lists use the existing 10-minute cache otherwise (T-10).
- **Layout.** Checked in light and dark, on desktop and at 390px, with nothing scrolling sideways.

## 5. Backend endpoints used

| Need | Endpoints |
|---|---|
| Categories | `GET /categories`, `POST /categories` (`name`, `hasBudgetEnvelope`, both required), `PATCH /categories/:id`, `DELETE /categories/:id` |
| Payment types | `GET /payment-types`, `POST /payment-types` (`name`, `hasStatement`, both required), `PATCH /payment-types/:id`, `DELETE /payment-types/:id` |
| Banks | `GET /banks`, `POST /banks` (`name`), `PATCH /banks/:id`, `DELETE /banks/:id` |
| Stores | `GET /stores`, `POST /stores` (`name`), `PATCH /stores/:id`, `DELETE /stores/:id` |

`GET /{lookup}/:id` isn't needed: the lists are loaded whole. The read hooks already exist (T-10); the mutations are new.

---

## 6. Gaps and questions

| ID | Item | Effect on this screen |
|---|---|---|
| G-7 | Name uniqueness: the software specification says ignoring case, the API docs say exact match | Doesn't block: the form checks ignoring case, the server answers 409 (S-14). Ask the backend which rule applies and align the docs |
| G-13 | No way to tell whether a lookup is in use. The UX brief (principle 5) wants lookups in use to say so before a delete is attempted | The refusal arrives after the confirmation (S-04). Suggested fix: an `inUse` flag, or the count of active references, on each lookup |
| G-14 | Does turning "Uses envelopes" off leave existing envelopes alone, as assumed here? The docs only say creating an envelope for such a category returns 400 | Check against the real API before building S-03; reword the hint if not |
| G-15 | The API documents no maximum length for names | The form sets none. Add one if the backend has a column limit |

## 7. Decisions to confirm

| Question | Proposal |
|---|---|
| Form shell | **Add:** inline card above the table (changed 2026-11-24, from a reference design). **Edit:** a panel or sheet, like the other forms, rather than editing in the row. Consistent, and room for the flags' hints |
| Switches in the list | Not inline. A flag with consequences (envelopes, bank rule) changes through the form, where the hint is |
| Sections as a submenu | **Decided 2026-11-24:** a submenu under Management in the sidebar, one page per section, instead of tabs on one page. On the phone, a list page at `/management` |
| Appearance | **Decided 2026-11-24:** dropped. The theme switch stays at the bottom of the sidebar and in the More sheet |
| Name check ignoring case | Yes, before sending (S-14) |

Out-of-scope items and backend gaps for the whole app are tracked in [todo.md](todo.md).
