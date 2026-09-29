# Varto — Product Specification

## Document purpose

This document defines the intentionally small MVP scope for Varto. It is the product contract for implementation and verification: production code must not precede this specification, and any later scope change must be recorded here before it is implemented.

## Product goal

Varto is a small personal finance tracker that helps one person record income and expenses manually and understand their finances for a selected month.

The MVP is successful when a user can maintain a local transaction history and reliably see monthly income, expenses, balance, and expense totals by category. It is designed to demonstrate a complete, evidence-backed engineering cycle rather than broad product coverage.

## Human decisions recorded

The following product decisions were made by the project owner:

- Varto is a single-user, local-only web application.
- Transactions are entered manually.
- A transaction is either income or expense.
- Expenses use a small fixed category set; income has no category.
- The user selects one currency—UAH, USD, or EUR—during initial setup.
- The selected currency applies to the whole application and cannot be changed afterward in the MVP.
- Data persists in the browser using `localStorage`.
- Users can edit and delete existing transactions.
- Deleting a transaction requires confirmation; undo is not included.
- Users can select a month and view its summary.
- Google Chrome is the reference browser for verification, using the current stable version available in the development environment.
- Authentication, accounts, budgets, bank integrations, cloud sync, and multi-currency conversion are excluded.

Using `localStorage` is an intentional scope decision: it keeps the core flows small and deterministic enough to implement and verify reliably within the capstone.

## Intentionally limited MVP scope

The MVP contains four capabilities only:

1. Select UAH, USD, or EUR as the application-wide currency during initial setup.
2. Create, view, edit, and delete manual transactions.
3. Persist the currency and transactions in the current browser.
4. Select a calendar month and view its financial summary.

### Transaction data

Every transaction has:

- a type: `income` or `expense`;
- an amount greater than zero;
- a calendar date;
- an expense category when, and only when, its type is `expense`.

No description, merchant, account, attachment, recurring schedule, tags, or other transaction metadata is required in the MVP.

### Fixed expense categories

- Car
- Health
- Cafes & Restaurants
- Utilities
- Gifts
- Travel
- Entertainment
- Transportation
- Groceries
- Other
- Pets

Income transactions do not have categories.

## Core user flows

### 1. Initial currency selection

1. The user opens Varto with no saved settings.
2. The user selects UAH, USD, or EUR for the application.
3. Varto saves the selection locally.
4. Varto uses that currency when accepting and displaying every amount.
5. The currency selection is no longer available after setup.

### 2. Record an expense

1. The user chooses to add an expense.
2. The user enters an amount and date and selects one fixed expense category.
3. The user saves the transaction.
4. The transaction appears in the transaction list and affects the summary for its calendar month.

### 3. Record income

1. The user chooses to add income.
2. The user enters an amount and date.
3. The user saves the transaction without selecting a category.
4. The transaction appears in the transaction list and affects the summary for its calendar month.

### 4. Correct a transaction

1. The user chooses an existing transaction to edit.
2. The user changes one or more supported fields.
3. The user saves valid changes.
4. The transaction list and all affected monthly summaries reflect the updated values.

### 5. Delete a transaction

1. The user chooses an existing transaction to delete.
2. Varto asks the user to confirm permanent deletion.
3. If the user cancels, Varto keeps the transaction unchanged.
4. If the user confirms, Varto removes the transaction permanently.
5. The deleted transaction no longer appears or contributes to any summary.

### 6. Review a month

1. The user selects a calendar month.
2. Varto shows only that month's transactions.
3. Varto shows total income, total expenses, and balance for that month.
4. Varto shows that month's expense total for each category that has spending.

### 7. Return later

1. The user refreshes or closes and reopens Varto in the same browser and browser profile.
2. The selected currency and saved transactions are restored from `localStorage`.

## Functional requirements

### Currency

- **FR-1:** On first use, Varto must require the user to select UAH, USD, or EUR as the application-wide currency before recording transactions.
- **FR-2:** Varto must persist the selected currency in `localStorage`.
- **FR-3:** Varto must display all monetary values using the selected currency consistently.
- **FR-4:** After initial setup, Varto must not provide a way to change the selected currency, convert between currencies, or assign different currencies to individual transactions.

### Transaction management

- **FR-5:** The user must be able to create an income transaction with a valid amount and date.
- **FR-6:** The user must be able to create an expense transaction with a valid amount, date, and one category from the fixed expense category set.
- **FR-7:** Income transactions must not require or store an expense category.
- **FR-8:** Varto must reject a transaction whose amount is missing, not numeric, or less than or equal to zero.
- **FR-9:** Varto must reject a transaction whose date is missing or invalid.
- **FR-10:** Varto must reject an expense whose category is missing or outside the fixed set.
- **FR-11:** The user must be able to view saved transactions for the selected month, including type, amount, date, and category where applicable.
- **FR-12:** The user must be able to edit the supported fields of an existing transaction, subject to the same validation as creation.
- **FR-13:** When an edit moves a transaction to a different month or changes its type, amount, or category, Varto must update every affected summary.
- **FR-14:** The user must be able to request deletion of an existing transaction, and Varto must require confirmation before permanently deleting it.
- **FR-15:** Cancelling a deletion must leave the transaction unchanged; confirming it must remove the transaction without an undo action. Varto must persist created, edited, and confirmed-deleted transaction state in `localStorage`.

### Monthly view and summary

- **FR-16:** The user must be able to select a calendar month.
- **FR-17:** Varto must include a transaction in a selected month based on the transaction's calendar date.
- **FR-18:** For the selected month, Varto must calculate total income as the sum of income transactions.
- **FR-19:** For the selected month, Varto must calculate total expenses as the sum of expense transactions.
- **FR-20:** For the selected month, Varto must calculate balance as total income minus total expenses.
- **FR-21:** For the selected month, Varto must calculate spending by category from expense transactions only.
- **FR-22:** A month with no transactions must show an empty transaction state and zero-valued summary rather than an error.

### Local persistence

- **FR-23:** Varto must restore the saved currency and transactions after a page reload in the same browser profile.
- **FR-24:** Varto must not require a server, account, or network connection for its core flows after the application itself has loaded.
- **FR-25:** Varto must keep one user's data isolated to the browser profile and origin in which it was entered, within the normal constraints of `localStorage`.

## Non-functional requirements

- **NFR-1 — Verifiability:** Core calculations and transaction rules must be deterministic and testable without external services.
- **NFR-2 — Data correctness:** Displayed totals must be derived from the persisted transactions and must update after every create, edit, or delete operation.
- **NFR-3 — Privacy:** The application must not transmit transaction or currency data to a backend, analytics service, or third party.
- **NFR-4 — Offline independence:** No core feature may depend on a live API or remote database.
- **NFR-5 — Usability:** Validation failures must identify the field that needs correction and must not save invalid data.
- **NFR-6 — Accessibility:** All core flows must be operable by keyboard, form controls must have accessible names, and status or validation information must not be conveyed by color alone.
- **NFR-7 — Resilience:** An empty data set must be a supported state. Unavailable or malformed persisted data must not cause an unrecoverable blank screen; the application must present a safe recoverable state without inventing transactions.
- **NFR-8 — Scope control:** The implementation must not add features listed as out of scope unless this specification is updated and approved first.
- **NFR-9 — Reference environment:** Core flows and acceptance criteria must be verified in the current stable Google Chrome version available in the development environment; the project does not target a fixed Chrome version.

## Acceptance criteria

### AC-1: First-use setup and persistence

Given no Varto settings exist in `localStorage`, when the user opens the application, then the user is required to select UAH, USD, or EUR before adding a transaction. After selection and page reload, the same currency is restored and used for monetary values, and no control is available to change it.

### AC-2: Add a valid expense

Given a currency is selected, when the user saves an expense with amount `25.50`, a valid date, and category `Groceries`, then exactly one expense is stored and shown for that date's month, monthly expenses increase by `25.50`, balance decreases by `25.50`, and the Groceries subtotal increases by `25.50`.

### AC-3: Add valid income without a category

Given a currency is selected, when the user saves income with amount `1000` and a valid date, then exactly one income transaction is stored without a category, monthly income increases by `1000`, and balance increases by `1000`.

### AC-4: Reject invalid transactions

Given the transaction form is open, when the user submits a missing, non-numeric, zero, or negative amount, an invalid or missing date, or an expense without a valid fixed category, then no transaction is stored and the relevant field is identified for correction.

### AC-5: Calculate a selected month correctly

Given the selected month contains income of `1000` and expenses of `100` in `Utilities`, `40` in `Transportation`, and `60` in `Utilities`, when the summary is displayed, then income is `1000`, expenses are `200`, balance is `800`, Utilities spending is `160`, and Transportation spending is `40`.

### AC-6: Isolate months

Given transactions exist in two different calendar months, when the user switches the selected month, then the transaction list and all summary values include only transactions dated in the newly selected month.

### AC-7: Edit a transaction

Given a saved `25.50` Groceries expense, when the user changes it to `30.00` in the Car category and saves, then only the updated transaction is retained, the old Groceries contribution is removed, and the Car and overall expense totals increase by `30.00`.

### AC-8: Edit a transaction's month

Given a transaction belongs to January, when the user changes its date to February and saves, then it no longer appears in or contributes to January and does appear in and contribute to February.

### AC-9: Delete a transaction

Given a saved transaction contributes to a monthly summary, when the user requests deletion, then Varto asks for confirmation. Cancelling keeps the transaction and summary unchanged. Confirming permanently removes the transaction from the list and `localStorage`, and it no longer contributes to the summary; no undo action is offered.

### AC-10: Restore saved state

Given the user has selected a currency and created, edited, or deleted transactions, when the page is reloaded in the same browser profile, then the latest saved state is restored without duplication or reversal of the changes.

### AC-11: Handle an empty month

Given the selected month contains no transactions, when it is displayed, then Varto shows an empty state with income `0`, expenses `0`, balance `0`, and no fabricated category spending.

### AC-12: Operate locally

Given the application has loaded, when the user completes the core flows, then no backend, authentication provider, bank API, cloud database, or currency-conversion service is required and no finance data is transmitted externally.

## Explicitly out of scope

The MVP does not include:

- authentication, registration, user profiles, or multiple users;
- financial accounts, wallets, account balances, or transfers;
- cloud storage, cloud sync, cross-device sync, or server-side persistence;
- bank connections, open-banking integrations, automatic transaction import, or statement import;
- multiple currencies per transaction or currency conversion;
- changing the selected currency after initial setup;
- budgets, savings goals, limits, alerts, or recommendations;
- recurring transactions, scheduled transactions, subscriptions, or reminders;
- custom categories, category management, income categories, tags, or subcategories;
- transaction descriptions, merchants, attachments, receipts, or location data;
- search, advanced filters, bulk actions, or transaction export/import;
- undo for transaction deletion;
- charts beyond the required monthly numbers and spending-by-category summary;
- weekly, quarterly, annual, comparative, predictive, or all-time analytics;
- shared finances, household collaboration, or permissions;
- notifications, email, social features, or integrations;
- a mobile-native application;
- data recovery after browser storage is cleared, private browsing ends, the application origin changes, or a different browser/profile/device is used.

## Assumptions and decisions still requiring human input

None. The MVP product decisions required before implementation have been resolved and recorded in this specification. Any new ambiguity or proposed scope change must be brought to the project owner and recorded here before implementation.
