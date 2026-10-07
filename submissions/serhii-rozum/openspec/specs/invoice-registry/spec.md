## Purpose

Browser-side invoice register with manual statuses and immutable issued snapshots.
## Requirements
### Requirement: FR-REG-01 Stored invoice statuses
The system SHALL persist invoice status as one of `draft`, `sent`, `paid`, or `cancelled` set manually by the user. A `draft` SHALL carry no invoice number; the number SHALL be minted from the per-year counter when a draft is issued as `sent` or `paid`. Allowed transitions are `draft → sent | paid | cancelled`, `sent → paid | cancelled` and `paid → sent | cancelled`; no record returns to `draft`, and `cancelled` is terminal.

#### Scenario: Mark sent
- **WHEN** the user marks a draft invoice as sent
- **THEN** the stored status becomes `sent` without any email integration, and the draft receives the next counter number for its issue year

#### Scenario: A draft carries no number
- **WHEN** a caller stores a `draft` with an invoice number, or updates a draft by id with a number or a non-draft status
- **THEN** the register rejects the write and nothing changes

#### Scenario: Number never reused
- **WHEN** a draft is issued after other invoices, including cancelled ones, have been numbered
- **THEN** it receives a number higher than every number already in the register

#### Scenario: No return to draft
- **WHEN** a caller sets a `sent`, `paid` or `cancelled` record back to `draft`
- **THEN** the register rejects the change with an immutability error

#### Scenario: Cancelled is terminal
- **WHEN** a caller changes the status of a `cancelled` record
- **THEN** the register rejects the change and the record stays `cancelled` with its number

### Requirement: FR-REG-02 Derived overdue display
The system SHALL derive `overdue` for display when status is `sent` and the payment deadline date is before today; overdue MUST NOT be stored.

#### Scenario: Overdue badge
- **WHEN** an invoice is `sent` and the payment deadline was yesterday
- **THEN** the derivation returns overdue while the stored status remains `sent`

#### Scenario: Overdue never persisted
- **WHEN** any invoice record is saved and read back
- **THEN** the stored record carries no `overdue` field — it is computed on demand

### Requirement: FR-REG-03 Issued invoice snapshot
An issued invoice record SHALL store a snapshot of all fields printed on the document; editing supplier or client directories MUST NOT alter past invoice snapshots.

#### Scenario: IBAN change isolation
- **WHEN** the user updates a supplier IBAN after issuing an invoice
- **THEN** previously issued invoices still show the IBAN from their snapshot

### Requirement: TC-DATA-01 Browser persistence
The invoice register SHALL persist in browser storage (localStorage or IndexedDB) with no server-side copy.

#### Scenario: Reload preserves register
- **WHEN** the user reloads the app in the same browser
- **THEN** previously saved invoices are still listed

