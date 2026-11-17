# Settings Screen — Functional Specification

Status: draft 1 · Last updated: 2026-11-17

The Settings screen is where the budget owner maintains the lists the rest of the app draws from (categories, payment types, banks and stores) and chooses the theme. It is used rarely, but without it a new bank or store can't be added from the app.

The forms and confirmations opened from this screen are specified here, because they are only reachable from it.

Related: [UX brief](../ui/ux-brief.md) · [Software specification](../software_specification.md) · [API docs](../APIs/api-reference.md) · [Month spec](month-screen.md) · [Backlog](todo.md) · [Design system](../../DESIGN_SYSTEM.md)

---

## 1. Feature map

Priority: **Must** = needed to replace the spreadsheet. **Should** = valuable, can follow shortly after.
Status: **Ready** = the backend supports it today. **Gap** = needs a backend change or an answer (section 6).

Feature IDs keep the numbering of [todo.md](todo.md) (S-01 to S-14), so the backlog and this spec point at the same things.

| ID | Feature | Priority | Status |
|---|---|---|---|
| **Screen** | | | |
| S-00 | Tabs: Categories, Payment types, Banks, Stores, Appearance | Must | Ready |
| **Categories** | | | |
| S-01 | List categories, showing which use envelopes | Must | Ready |
| S-02 | Add and rename a category | Must | Ready |
| S-03 | Turn "Uses envelopes" on or off | Must | Ready |
| S-04 | Delete a category | Must | Ready (see G-13) |
| **Payment types** | | | |
| S-05 | List payment types, showing which require a bank | Must | Ready |
| S-06 | Add and rename a payment type | Must | Ready |
| S-07 | Turn "Requires a bank" on or off | Must | Ready |
| S-08 | Delete a payment type | Must | Ready (see G-13) |
| **Banks** | | | |
| S-09 | List, add and rename banks | Must | Ready |
| S-10 | Delete a bank | Must | Ready (see G-13) |
| **Stores** | | | |
| S-11 | List, add and rename stores | Must | Ready |
| S-12 | Delete a store | Must | Ready (see G-13) |
| **Appearance** | | | |
| S-13 | Choose light or dark theme (moved from the More sheet, A-03) | Must | Ready |
| **Rules across the screen** | | | |
| S-14 | Duplicate names are rejected with a clear message | Must | Ready (see G-7) |

---

## 2. Definitions

| Term | Meaning |
|---|---|
| **Lookup** | One of the four lists: category, payment type, bank, store. Each item has a name; categories also have **Uses envelopes** and payment types also have **Requires a bank** |
| **Uses envelopes** | The category's `hasBudgetEnvelope`. Months opened from now on get an envelope for it, and envelopes can be added for it (M-23) |
| **Requires a bank** | The payment type's `hasStatement`. An expense with this payment type must have a bank (M-14) |
| **Actively referenced** | What the backend checks before a delete: a recurring bill that isn't cancelled (or is cancelled on or after the first day of the current UTC month), or an expense in the current or a future month. For categories, also an envelope in the current or a future month. References from past months **don't** block a delete |
| **Deleted lookup** | A lookup that was deleted. It stays on the past expenses that used it, shown as "Name (deleted)" (M-05, M-17), but can't be picked for new ones |

---

## 3. Features

### Screen

#### S-00 Tabs

*As the budget owner, I want one place for every list, so I don't hunt through the app to add a bank.*

**How it works**
1. The page title is "Settings". Below it, five tabs: **Categories**, **Payment types**, **Banks**, **Stores**, **Appearance**.
2. The selected tab is kept in the address (`?tab=banks`), so a link or the back button returns to it. Without it, Categories is shown. An unknown value falls back to Categories.
3. Each lookup tab has the same layout (S-01): a header with the tab's **Add** button and a list below it, inside one card.
4. On the phone the tabs scroll sideways; nothing else scrolls horizontally.

**Acceptance criteria**
- *Given* no `tab` in the address, *when* I open Settings, *then* Categories is shown.
- *Given* I tap Banks, *then* the address reads `?tab=banks` and Back returns to the previous tab.

### Lookup lists (S-01, S-05, S-09, S-11)

#### The list

*As the budget owner, I want to see every item of a list at a glance.*

**How it works**
- Rows are sorted alphabetically (ignoring case). The lists are short and **not paginated** (the API returns them whole).
- Each row shows the name, and for categories and payment types a **badge** after it: "Uses envelopes" on a category that has them, "Requires a bank" on a payment type that does. Items without the flag show no badge.
- Each row has a menu with **Edit** and **Delete**. On the phone the whole row isn't tappable; the menu button has a 44px touch target.
- Loading shows skeleton rows. A failed load shows an inline error with **Retry**. An empty list shows "No {items} yet" with an Add button.

**Acceptance criteria**
- *Given* categories Transport, Grocery and Hydro, *then* they are listed Grocery, Hydro, Transport.
- *Given* Grocery uses envelopes, *then* its row shows the "Uses envelopes" badge and Transport's doesn't.

### Add and rename (S-02, S-06, S-09, S-11)

*As the budget owner, I want to add an item or fix its name.*

**How it works**
1. **Add** opens a form: a side panel on desktop and a full-height sheet on the phone, the same shell as the income and envelope forms (react-hook-form + Zod, red borders with the reason kept for screen readers, **Save** and **Cancel**).
2. **Edit** opens the same form prefilled, titled "Edit {item}". Only the changed fields are sent; saving with no change closes without a request.
3. Fields:

| Lookup | Fields |
|---|---|
| Category | Name\*, **Uses envelopes** (switch, off by default) |
| Payment type | Name\*, **Requires a bank** (switch, off by default) |
| Bank | Name\* |
| Store | Name\* |

4. On success the form closes, the list refreshes and a toast says "{Name} added" or "{Name} saved".

**Rules**
- The name is trimmed and can't be empty. The API documents no maximum length; the form follows the API.
- Renaming changes the name wherever the item is shown, including past expenses, because expenses show the item's current name.
- The form closes when the tab changes. Only one panel is open at a time.
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
- Turning it **off** doesn't remove envelopes that already exist. They can be deleted from the Month screen (M-24).

**Acceptance criteria**
- *Given* a category without envelopes, *when* I turn the switch on and save, *then* its row shows the "Uses envelopes" badge and the category is offered in + Add → Category.

#### S-07 Requires a bank

*As the budget owner, I want payment types like credit cards to demand a bank.*

- The switch is in the payment type form. A hint reads: "Expenses paid this way must have a bank. Existing expenses aren't checked again."
- The expense form uses the new setting as soon as the list is refreshed (the Bank field's asterisk follows the chosen payment type, M-14).

**Acceptance criteria**
- *Given* "Debit" doesn't require a bank, *when* I turn the switch on, *then* adding an expense paid with Debit marks Bank as required.

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

### Appearance (S-13)

*As the budget owner, I want to choose light or dark.*

- The **Appearance** tab holds the theme choice, with the same options as the current theme switch, applied at once and remembered on this device as today.
- Shipping this removes the theme switch from its current place and the **More** sheet with it (A-03): the phone tab bar keeps Month, Recurring and Settings, and `MORE_NAV_ITEMS` and the code that opens the sheet go away.

**Acceptance criteria**
- *Given* the Appearance tab, *when* I pick dark, *then* the whole app is dark and stays dark after a reload.
- *Given* the phone, *then* the tab bar shows three tabs and no More button.

### S-14 Duplicate names

- The backend answers 409 for a duplicate. The screen shows the message of the Add and rename table.
- **Before sending**, the form compares the name, ignoring case and surrounding spaces, with the list already loaded and marks the field at once. This is stricter than an exact match, and safe either way: if the backend turns out to be case-sensitive (G-7), "grocery" next to "Grocery" is blocked by the screen only, which is the intended behaviour for a one-person budget.
- The server's answer always wins when the list on screen is stale.

**Acceptance criteria**
- *Given* "Grocery" exists, *when* I type " grocery " in a new category, *then* the field turns red before I save.

---

## 4. Rules across the screen

- **Editing is always allowed.** There are no read-only states on this screen.
- **Strings** live in `src/constants/translations.ts`; colours only through tokens.
- **Cache.** A change invalidates the lookup's query key, so the Month screen's forms and rows show it without a reload. The lists use the existing 10-minute cache otherwise (T-10).
- **Layout.** Checked in light and dark, on desktop and at 390px, with nothing scrolling sideways except the tab strip.

## 5. Backend endpoints used

| Need | Endpoints |
|---|---|
| Categories | `GET`, `POST`, `PATCH`, `DELETE /categories` (`name`, `hasBudgetEnvelope`) |
| Payment types | `GET`, `POST`, `PATCH`, `DELETE /payment-types` (`name`, `hasStatement`) |
| Banks | `GET`, `POST`, `PATCH`, `DELETE /banks` (`name`) |
| Stores | `GET`, `POST`, `PATCH`, `DELETE /stores` (`name`) |

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
| Form shell for add and edit | A panel or sheet, like the other forms, rather than editing in the row. Consistent, and room for the switches' hints |
| Switches in the list | Not inline. A flag with consequences (envelopes, bank rule) changes through the form, where the hint is |
| Appearance as a tab | A fifth tab, as in the UX brief ("tabs, and the theme"), rather than a separate section above the tabs |
| Name check ignoring case | Yes, before sending (S-14) |

Out-of-scope items and backend gaps for the whole app are tracked in [todo.md](todo.md).
