# listings Specification

## Purpose
Records the ads and shop pages (listings) that could supply a project's parts, who the seller is, and
how the negotiation with that seller is going, so no conversation gets lost among browser tabs.

Scenario tags name the test level: `[BLL]` business-logic unit, `[API]` HTTP integration, `[FE]`
frontend unit, `[E2E]` end-to-end.

## Requirements

### Requirement: Add a listing to a project
The system SHALL add a listing to an existing project with:
- a title (1–200 characters after trimming);
- an absolute `http` or `https` URL (at most 2048 characters);
- a platform name (1–50 characters, free text);
- an optional seller name and seller contact (each at most 200 characters);
- optional notes (at most 2000 characters);
- an optional agreed total (an amount and a currency; see the offers capability for money rules).

A new listing SHALL start in status `Found`, with its status change time set to the creation time.

#### Scenario: Add a listing [API]
- **WHEN** a client sends `POST /api/projects/{projectId}/listings` with title "Inverter + battery bundle", an OLX URL and platform "OLX"
- **THEN** the response is `201 Created` with a `Location` header and the listing, with status `Found` and `statusChangedAt` set

#### Scenario: Reject an invalid URL [BLL]
- **WHEN** a listing is created or updated with a URL that is relative, uses a scheme other than http or https, or is longer than 2048 characters
- **THEN** the operation fails with a validation error for `url`

#### Scenario: Platform suggestions with free text [FE]
- **WHEN** the user opens the platform field in the listing form
- **THEN** it suggests OLX, eBay, Allegro, Amazon, Rozetka and Prom, and also accepts any other text

### Requirement: List the listings of a project
The system SHALL list the listings of a project in the order they were added.

#### Scenario: List listings [API]
- **WHEN** a client sends `GET /api/projects/{projectId}/listings`
- **THEN** the response is `200 OK` with the project's listings, including status, platform and `statusChangedAt`

#### Scenario: Listings tab [FE]
- **WHEN** the user opens the "Listings" tab of the project detail page
- **THEN** each listing shows its title as a link to its detail page, the platform, the seller name and a status chip

### Requirement: Edit and delete a listing
The system SHALL allow a listing's fields other than the status to be changed under the same rules as
on creation, without changing its status or status change time. It SHALL delete a listing together
with its offers, and SHALL keep the items that those offers were linked to.

#### Scenario: Editing fields keeps the status time [BLL]
- **WHEN** the notes of a listing in status `Contacted` are changed
- **THEN** the status is still `Contacted` and `statusChangedAt` is unchanged

#### Scenario: Update a listing [API]
- **WHEN** a client sends `PUT /api/listings/{listingId}` with valid fields
- **THEN** the response is `200 OK` with the updated listing

#### Scenario: Delete a listing, keep the items [API]
- **WHEN** a client sends `DELETE /api/listings/{listingId}` for a listing whose offer was the chosen offer of an item
- **THEN** the response is `204 No Content`, the item still exists, and it no longer has a chosen offer

### Requirement: Track the negotiation status
The system SHALL let the user set a listing's status to any of `Found`, `Contacted`, `Negotiating`,
`Agreed`, `Purchased`, `Received`, `NotResponding`, `Declined` or `Scam`, from any other status. The
status change time SHALL be updated only when the status actually changes.

#### Scenario: Any transition is allowed [BLL]
- **WHEN** a listing in `Scam` is set to `Negotiating`
- **THEN** the listing's status is `Negotiating` and `statusChangedAt` is the time of the change

#### Scenario: Setting the same status keeps the time [BLL]
- **WHEN** a listing in `Contacted` is set to `Contacted` again
- **THEN** `statusChangedAt` is unchanged

#### Scenario: Set status through the API [API]
- **WHEN** a client sends `PATCH /api/listings/{listingId}/status` with status `Negotiating`
- **THEN** the response is `200 OK` with the listing in status `Negotiating`

#### Scenario: Change status on the listing page [FE]
- **WHEN** the user picks `NotResponding` in the status selector of the listing detail page
- **THEN** the status is sent to the API and the page shows `NotResponding` and the new status time

### Requirement: Listing detail page
The UI SHALL show a listing's fields, its status, and the offers it makes for any of the project's
items.

#### Scenario: Offers across items [FE]
- **WHEN** the listing detail page loads for a bundle listing linked to two items
- **THEN** it shows both offers, each with the item name, the asking and agreed unit prices, the fit status and whether the offer is chosen
