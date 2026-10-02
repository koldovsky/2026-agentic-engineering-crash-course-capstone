# items Specification

## Purpose
Keeps the list of parts (items) a project needs, how many of each, and where each part is in sourcing,
so the user can see at a glance what is still missing.

Scenario tags name the test level: `[BLL]` business-logic unit, `[API]` HTTP integration, `[FE]`
frontend unit, `[E2E]` end-to-end.

## Requirements

### Requirement: Add an item to a project
The system SHALL add an item to an existing project from a name (1–200 characters after trimming), a
quantity (a whole number from 1 to 10000) and optional notes (at most 2000 characters). A new item
SHALL start in status `Needed`.

#### Scenario: Add an item [API]
- **WHEN** a client sends `POST /api/projects/{projectId}/items` with name "Inverter", quantity 1 and notes
- **THEN** the response is `201 Created` with a `Location` header and the item, with status `Needed` and no chosen offer

#### Scenario: Reject an invalid quantity [BLL]
- **WHEN** an item is created or updated with quantity 0, a negative number, or more than 10000
- **THEN** the operation fails with a validation error for `quantity` and nothing is stored

#### Scenario: Reject a blank name [BLL]
- **WHEN** an item is created or updated with an empty or whitespace-only name
- **THEN** the operation fails with a validation error for `name`

#### Scenario: Unknown project [API]
- **WHEN** a client sends `POST /api/projects/{projectId}/items` for a project that does not exist
- **THEN** the response is `404 Not Found`

### Requirement: List the items of a project
The system SHALL list the items of a project in the order they were added. Each item SHALL include a
short summary of its chosen offer (offer id, listing id, listing title, unit price) or `null` when
there is no chosen offer.

#### Scenario: List items with chosen offers [API]
- **WHEN** a client sends `GET /api/projects/{projectId}/items` for a project where one of two items has a chosen offer
- **THEN** the response is `200 OK` with both items in the order they were added; one has `chosenOffer` filled in and the other has `chosenOffer` null

#### Scenario: Order is kept for rapid additions [API]
- **WHEN** a client adds 20 items to a project one after another as fast as possible
- **THEN** `GET /api/projects/{projectId}/items` returns them in exactly the order they were added

#### Scenario: Items table [FE]
- **WHEN** the project detail page shows its items
- **THEN** each row shows the name, quantity, a status chip and the chosen offer's listing title and price, or "—" when there is no chosen offer

### Requirement: Edit and delete an item
The system SHALL allow an item's name, quantity and notes to be changed under the same rules as on
creation, and SHALL delete an item together with its offers.

#### Scenario: Update an item [API]
- **WHEN** a client sends `PUT /api/items/{itemId}` with a new name, quantity and notes
- **THEN** the response is `200 OK` with the updated item, and its status is unchanged

#### Scenario: Delete an item and its offers [API]
- **WHEN** a client sends `DELETE /api/items/{itemId}` for an item that has offers
- **THEN** the response is `204 No Content`, the item's offers no longer appear in its listings' offers, and the listings themselves still exist

### Requirement: Set the sourcing status manually
The system SHALL let the user set an item's status to any of `Needed`, `Sourcing`, `Ordered` or
`Received`, in any order. The status SHALL NOT change as a side effect of offer or listing changes.

#### Scenario: Any status transition is allowed [BLL]
- **WHEN** an item in `Received` is set back to `Sourcing`
- **THEN** the item's status is `Sourcing`

#### Scenario: Choosing an offer does not change the item status [BLL]
- **WHEN** an offer is chosen for an item in status `Needed`
- **THEN** the item's status is still `Needed`

#### Scenario: Set status through the API [API]
- **WHEN** a client sends `PATCH /api/items/{itemId}/status` with status `Ordered`
- **THEN** the response is `200 OK` with the item in status `Ordered`

#### Scenario: Unknown status value [API]
- **WHEN** a client sends `PATCH /api/items/{itemId}/status` with status `Lost`
- **THEN** the response is `400` with a problem details body

#### Scenario: Change status from the items table [FE]
- **WHEN** the user picks `Ordered` in the status menu of an item row
- **THEN** the status is sent to the API and the row's chip shows `Ordered`
