# projects Specification

## Purpose
Lets a single user keep each DIY project (for example "Solar station") as a named workspace that groups
the parts it needs and the listings that may supply them, and see its sourcing progress and cost.

Scenario tags name the test level: `[BLL]` business-logic unit, `[API]` HTTP integration, `[FE]`
frontend unit, `[E2E]` end-to-end.

## Requirements

### Requirement: Create a project
The system SHALL create a project from a name (1–200 characters after trimming) and an optional
description (at most 2000 characters). It SHALL record the creation time in UTC.

#### Scenario: Create a project [API]
- **WHEN** a client sends `POST /api/projects` with name "Solar station" and a description
- **THEN** the response is `201 Created` with a `Location` header and a body containing the new id, the trimmed name, the description and `createdAt`

#### Scenario: Reject a blank or too long name [BLL]
- **WHEN** a project is created with a name that is empty, only whitespace, or longer than 200 characters
- **THEN** creation fails with a validation error for `name` and nothing is stored

#### Scenario: Create a project from the UI [FE]
- **WHEN** the user fills in the name in the "New project" dialog on the project list and confirms
- **THEN** the project is created through the API and appears in the list without a page reload

### Requirement: List projects
The system SHALL list all projects, newest first, each with its number of items and listings.

#### Scenario: List projects with counts [API]
- **WHEN** a client sends `GET /api/projects` after creating two projects, one of them with 2 items and 1 listing
- **THEN** the response is `200 OK` with both projects, the newest first, and that project shows `itemCount` 2 and `listingCount` 1

#### Scenario: Empty project list [FE]
- **WHEN** the project list page loads and the API returns no projects
- **THEN** the page shows an empty state with a "New project" action

### Requirement: View and edit a project
The system SHALL return a single project by id and SHALL allow its name and description to be
changed under the same rules as on creation.

#### Scenario: Get a project [API]
- **WHEN** a client sends `GET /api/projects/{id}` for an existing project
- **THEN** the response is `200 OK` with the project

#### Scenario: Update a project [API]
- **WHEN** a client sends `PUT /api/projects/{id}` with a new valid name and description
- **THEN** the response is `200 OK` with the updated project, and `createdAt` is unchanged

### Requirement: Delete a project
The system SHALL delete a project together with all its items, listings and offers.

#### Scenario: Delete a project and its data [API]
- **WHEN** a client sends `DELETE /api/projects/{id}` for a project that has items, listings and offers
- **THEN** the response is `204 No Content`, and later requests for the project, its items, listings and offers return `404 Not Found`

#### Scenario: Confirm before deleting [FE]
- **WHEN** the user clicks "Delete" on a project
- **THEN** a confirmation dialog names the project, and the API is called only after the user confirms

### Requirement: Project summary
The system SHALL provide a summary of a project containing:
- the number of items in each item status, with every status present even when its count is 0;
- the total cost per currency, computed over the items that have a chosen offer, as the chosen
  offer's unit price (the agreed price when set, otherwise the asking price) multiplied by the item
  quantity;
- the items that have no chosen offer;
- the chosen offers that have neither an agreed nor an asking price.

Amounts in different currencies SHALL NOT be converted or added together.

#### Scenario: Counts by status include zeros [BLL]
- **WHEN** a project has 2 items in `Needed` and 1 in `Ordered`
- **THEN** the summary reports Needed 2, Sourcing 0, Ordered 1, Received 0

#### Scenario: Total uses agreed price over asking price, times quantity [BLL]
- **WHEN** item A (quantity 2) has a chosen offer with asking 100 UAH and agreed 90 UAH, and item B (quantity 1) has a chosen offer with asking 50 UAH only
- **THEN** the UAH total is 230 (90 × 2 + 50 × 1)

#### Scenario: Totals are kept per currency [BLL]
- **WHEN** one chosen offer is priced in UAH and another in EUR
- **THEN** the summary lists a separate total for UAH and for EUR, and no combined total

#### Scenario: Totals may exceed the single-price limit [BLL]
- **WHEN** an item with quantity 2 has a chosen offer with agreed price 999999999.99 UAH
- **THEN** the UAH total is 1999999999.98

#### Scenario: Missing choices and prices are reported [BLL]
- **WHEN** one item has no chosen offer and another item's chosen offer has no price
- **THEN** the first item is listed under items without a chosen offer, the second offer is listed under chosen offers without a price, and neither affects any total

#### Scenario: Summary endpoint [API]
- **WHEN** a client sends `GET /api/projects/{id}/summary`
- **THEN** the response is `200 OK` with `itemCountsByStatus`, `totals` (a list of amount and currency), `itemsWithoutChosenOffer` and `chosenOffersWithoutPrice`

#### Scenario: Summary card on the project page [FE]
- **WHEN** the project detail page shows a summary with totals in two currencies
- **THEN** the summary card shows one line per currency and the count of items without a chosen offer

### Requirement: API errors are problem details
The API SHALL report errors as RFC 9457 problem details (`application/problem+json`):
- invalid input → `400` with an `errors` object keyed by field name;
- an unknown id → `404`;
- a violated business rule → `409` with a `type`, `title` and `status` that are always present, where
  `type` is a stable URI that names the rule.

#### Scenario: Validation error shape [API]
- **WHEN** a client sends `POST /api/projects` with an empty name
- **THEN** the response is `400` with content type `application/problem+json` and an `errors.name` entry

#### Scenario: Unknown id [API]
- **WHEN** a client sends `GET /api/projects/{id}` with an id that does not exist
- **THEN** the response is `404` with content type `application/problem+json`

### Requirement: Track a project end to end
The system SHALL support the whole MVP-1 flow in the running application: from creating a project to
seeing its cost.

#### Scenario: From project to total [E2E]
- **WHEN** the user creates the project "Solar station", adds the items "Inverter" and "Battery", adds one OLX listing, links it to both items with prices in UAH, marks the battery offer `WrongItem`, sets the listing to `Negotiating`, and chooses the inverter offer
- **THEN** the project page shows the listing as `Negotiating`, the battery as having no chosen offer, and a UAH total equal to the inverter's unit price times its quantity
