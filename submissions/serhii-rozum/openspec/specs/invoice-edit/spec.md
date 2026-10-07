## Purpose

Edit and duplicate existing invoices in the browser register.
## Requirements
### Requirement: FR-EDIT-02 Duplicate invoice
The user SHALL be able to duplicate any invoice that has saved form values into a new `draft` that copies the client and service data and is dated today. A duplicate MUST NOT receive an invoice number: the number SHALL be minted from the per-year counter only when the draft is issued. Correcting a `sent` invoice SHALL cancel the original (which keeps its number) and duplicate it into a new draft, as one register write.

#### Scenario: Duplicate flow
- **WHEN** the user duplicates an existing invoice of any status
- **THEN** a new `draft` record is created with a new id, no invoice number, today's issue date, a payment deadline shifted by the original payment term, and the same client, service and amounts; the original record is unchanged

#### Scenario: Duplicate is isolated from the original
- **WHEN** the duplicated draft is edited and saved
- **THEN** the original record's snapshot and values are unchanged

#### Scenario: Number minted at issue, never at duplicate
- **WHEN** an unnumbered draft is marked `sent` (or `paid`)
- **THEN** it receives the next counter number `YYYY-NNN` for its issue year, never reusing a number already in the register, including numbers of cancelled invoices

#### Scenario: Correct a sent invoice
- **WHEN** the user corrects a `sent` invoice
- **THEN** the original becomes `cancelled` and keeps its number, and a new unnumbered `draft` duplicate is created and opened for editing

#### Scenario: No dead-end drafts
- **WHEN** a caller duplicates or corrects a record that has no saved form values
- **THEN** the register rejects the request with a missing-source error and writes nothing, and the read-only view hides the copy and correct actions with an explanation

#### Scenario: Correction is only for sent invoices
- **WHEN** a caller requests correction of a `draft`, `paid` or `cancelled` invoice
- **THEN** the register rejects the request and nothing is written

### Requirement: FR-EDIT-01 Edit draft by record id
The user SHALL be able to open a `draft` invoice by its register record id at `/invoices/{id}/edit`, change any field, and save it; dependent fields (line amount, total, prepayment, balance, payment deadline, printed snapshot) SHALL be recalculated on save. Issued invoices (`sent`, `paid`, `cancelled`) are immutable: the edit route SHALL show them read-only, and the register MUST reject any in-place mutation of a non-draft record.

#### Scenario: Open draft for editing
- **WHEN** the user opens `/invoices/{id}/edit` for a stored `draft` that carries its saved form values
- **THEN** the edit form is shown prefilled with those values and every field is editable

#### Scenario: Save recalculates dependent fields
- **WHEN** the user changes the unit price, quantity, prepayment percent, or payment days of a draft and saves
- **THEN** the stored line amount, total, prepayment, balance and payment deadline are recomputed from the new values, and the record keeps its id, its `draft` status and has no invoice number

#### Scenario: Issued invoice is read-only on the edit route
- **WHEN** the user opens `/invoices/{id}/edit` for a `sent`, `paid` or `cancelled` invoice
- **THEN** a read-only view with the status badge is shown, no editable form or save action is offered, and the duplicate action is available

#### Scenario: Register refuses to mutate an issued record
- **WHEN** any caller updates a `sent`, `paid` or `cancelled` record by id
- **THEN** the register rejects the write with an immutability error and the stored record is unchanged

#### Scenario: Issued invoice cannot be reopened as a draft
- **WHEN** any caller sets the status of a `sent`, `paid` or `cancelled` record back to `draft`
- **THEN** the register rejects the change and the stored status is unchanged

#### Scenario: Cancelled is terminal
- **WHEN** any caller sets the status of a `cancelled` record to `draft`, `sent` or `paid`
- **THEN** the register rejects the change with an immutability error and the record stays `cancelled`

#### Scenario: Update by id never issues a draft
- **WHEN** a caller updates a draft by id with a status other than `draft`, or with an invoice number
- **THEN** the register rejects the write and the stored draft is unchanged; issuing happens only through the status change that mints the number

#### Scenario: Numbered draft refused
- **WHEN** a caller creates a `draft` record that carries an invoice number
- **THEN** the register rejects it with the message "A draft cannot carry an invoice number; it is minted when the draft is issued." and nothing is written

#### Scenario: Edit form submit
- **WHEN** the edit route renders the invoice form with a save handler and label
- **THEN** the form shows a submit button with that label, while `/invoices/new` (no handler) shows none and behaves as before

#### Scenario: Save with an unclassified service
- **WHEN** the user saves a draft whose service text has no resolved classification
- **THEN** nothing is saved and a visible error is shown on the service classification field

#### Scenario: Unknown record id
- **WHEN** the user opens `/invoices/{id}/edit` for an id that is not in the register
- **THEN** a not-found state with a link back to the invoice list is shown

