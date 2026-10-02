## Purpose

Links an item to a listing that could supply it, with the price for that item from that listing and
whether the offered part actually fits, and marks which offer the user has chosen for each item.

Scenario tags name the test level: `[BLL]` business-logic unit, `[API]` HTTP integration, `[FE]`
frontend unit, `[E2E]` end-to-end.

## ADDED Requirements

### Requirement: Link an item to a listing
The system SHALL create an offer that links an existing item to an existing listing, with an optional
asking price and an optional agreed price. Both prices are **unit** prices for one piece of the item.
A new offer SHALL have fit `Unverified` and SHALL NOT be chosen. One listing MAY have offers for
several items (a bundle ad).

#### Scenario: Create an offer [API]
- **WHEN** a client sends `POST /api/items/{itemId}/offers` with a listing id from the same project and asking price 12000 UAH
- **THEN** the response is `201 Created` with a `Location` header and the offer, with fit `Unverified`, `isChosen` false, and the item name, listing title, listing platform and listing status

#### Scenario: A bundle listing supplies two items [BLL]
- **WHEN** offers are created that link the same listing to two different items of the project
- **THEN** both offers exist, and each item has one offer from that listing

### Requirement: Item and listing belong to the same project
The system SHALL reject an offer whose listing belongs to a different project than its item.

#### Scenario: Listing from another project [BLL]
- **WHEN** an offer is created for an item of project A and a listing of project B
- **THEN** creation fails with the rule violation `listing-in-other-project` and nothing is stored

#### Scenario: Rule violation over HTTP [API]
- **WHEN** a client sends `POST /api/items/{itemId}/offers` with a listing id from another project
- **THEN** the response is `409` with a problem details body whose `type` ends with `/problems/listing-in-other-project`

### Requirement: No duplicate links
The system SHALL reject a second offer for the same item and the same listing.

#### Scenario: Duplicate link [BLL]
- **WHEN** an offer is created for an item and a listing that are already linked
- **THEN** creation fails with the rule violation `duplicate-offer` and the existing offer is unchanged

#### Scenario: Duplicate link over HTTP [API]
- **WHEN** a client sends the same `POST /api/items/{itemId}/offers` twice
- **THEN** the second response is `409` with a problem details body whose `type` ends with `/problems/duplicate-offer`

### Requirement: Prices are valid money
Every price (offer asking and agreed prices, listing agreed total) SHALL be an amount from 0 to
999999999.99 with at most two decimal places, and a currency that is an active ISO 4217 code of a
circulating currency written in three uppercase letters (for example `UAH`, `EUR`, `USD`, `PLN`). The
special ISO 4217 codes are not currencies you can buy parts with, and they SHALL be rejected: `XXX` (no
currency), `XTS` (testing), precious metals (`XAU`, `XAG`, `XPT`, `XPD`), bond-market units
(`XBA`–`XBD`), `XDR`, `XSU`, `XUA`, and fund codes. Amounts in different currencies are never converted.

#### Scenario: Reject a negative amount [BLL]
- **WHEN** an offer is created or updated with asking price -1 UAH
- **THEN** the operation fails with a validation error for `askingPrice.amount`

#### Scenario: Reject an invalid currency code [BLL]
- **WHEN** a price has currency `uah`, `EURO` or an empty string
- **THEN** the operation fails with a validation error for that price's `currency`

#### Scenario: Reject an unknown currency code [BLL]
- **WHEN** a price has currency `ZZZ`, which has the right shape but is not an ISO 4217 code
- **THEN** the operation fails with a validation error for that price's `currency`

#### Scenario: Reject special currency codes [BLL]
- **WHEN** a price has currency `XXX`, `XTS`, `XAU` or `XDR`, which are active ISO 4217 codes but not circulating currencies
- **THEN** the operation fails with a validation error for that price's `currency`

#### Scenario: Reject more than two decimal places [BLL]
- **WHEN** a price has amount 10.999
- **THEN** the operation fails with a validation error for that price's `amount`

### Requirement: Update, list and delete offers
The system SHALL allow an offer's asking and agreed prices to be changed. It SHALL list the offers of
an item and the offers of a listing, each in the order they were created, and SHALL delete a single
offer.

#### Scenario: Update prices [API]
- **WHEN** a client sends `PUT /api/offers/{offerId}` with agreed price 11000 UAH
- **THEN** the response is `200 OK` with the updated offer, and its fit and choice are unchanged

#### Scenario: Offers of an item [API]
- **WHEN** a client sends `GET /api/items/{itemId}/offers` for an item with offers from two listings
- **THEN** the response is `200 OK` with both offers, each with its listing title, platform and listing status

#### Scenario: Offers of a listing [API]
- **WHEN** a client sends `GET /api/listings/{listingId}/offers` for a bundle listing linked to two items
- **THEN** the response is `200 OK` with both offers, each with its item name

#### Scenario: Delete an offer [API]
- **WHEN** a client sends `DELETE /api/offers/{offerId}` for the chosen offer of an item
- **THEN** the response is `204 No Content`, and the item has no chosen offer

### Requirement: Record whether the part fits
The system SHALL let the user set an offer's fit to `Unverified`, `Fits`, `NotQuiteRight` or
`WrongItem`, in any order.

#### Scenario: Set fit through the API [API]
- **WHEN** a client sends `PATCH /api/offers/{offerId}/fit` with fit `WrongItem`
- **THEN** the response is `200 OK` with the offer's fit set to `WrongItem`

### Requirement: One chosen offer per item
The system SHALL keep at most one chosen offer per item. Choosing an offer SHALL un-choose the item's
previously chosen offer in the same operation. Un-choosing an offer SHALL leave the item with no chosen
offer. Choosing an offer SHALL NOT change the item status, the listing status or the fit.

#### Scenario: Choosing switches the choice [BLL]
- **WHEN** offer 1 of an item is chosen and then offer 2 of the same item is chosen
- **THEN** offer 2 is chosen and offer 1 is not

#### Scenario: Choice is per item [BLL]
- **WHEN** a bundle listing has offers for items A and B, and both offers are chosen
- **THEN** both offers stay chosen, because they belong to different items

#### Scenario: Un-choose an offer [BLL]
- **WHEN** the chosen offer of an item is un-chosen
- **THEN** the item has no chosen offer

#### Scenario: Switching back and forth [API]
- **WHEN** an item has offers 1 and 2, and a client chooses offer 1, then offer 2, then offer 1 again through `PATCH /api/offers/{offerId}/choice`
- **THEN** every response is `200 OK`, and after each step `GET /api/items/{itemId}/offers` shows exactly one chosen offer, the one chosen last

#### Scenario: Choose through the API [API]
- **WHEN** a client sends `PATCH /api/offers/{offerId}/choice` with `isChosen` true for an item that already has another chosen offer
- **THEN** the response is `200 OK` with this offer chosen, and `GET /api/items/{itemId}/offers` shows exactly one chosen offer

### Requirement: Manage offers on the item page
The UI SHALL show an item's offers and let the user link a listing, edit prices, set the fit and
choose an offer.

#### Scenario: Link a listing from the item page [FE]
- **WHEN** the user clicks "Add offer" on the item detail page, picks a listing of the same project and enters an asking price
- **THEN** the offer is created through the API and appears in the item's offer list with fit `Unverified`

#### Scenario: Choose an offer from the item page [FE]
- **WHEN** the user clicks "Choose" on a second offer while another offer is chosen
- **THEN** the choice is sent to the API, and after the response the list marks only the second offer as chosen

#### Scenario: Wrong items are visible [FE]
- **WHEN** an offer has fit `WrongItem`
- **THEN** the offer row shows the fit with a warning style
