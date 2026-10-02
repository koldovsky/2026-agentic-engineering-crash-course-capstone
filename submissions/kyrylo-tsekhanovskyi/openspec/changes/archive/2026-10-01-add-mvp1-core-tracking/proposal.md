## Why

Parts for a DIY project (a solar station, a smart home) are bought from many shops and private sellers.
Today the ads, the negotiations and the prices live in browser tabs and bookmarks, so it is easy to
lose track of what is still needed, which seller answered, and what the project will cost. MVP-1 gives
one place to track the parts a project needs, the ads that could supply them, and the state of each
negotiation. It also creates the first behaviour specs of the product.

## What Changes

- **Projects**: create, list, view, rename/describe and delete DIY projects. A project summary shows
  item counts by status, the total cost of the chosen offers per currency, items with no chosen offer,
  and chosen offers that have no price yet.
- **Items**: the parts a project needs (name, quantity, notes) with a manually set sourcing status
  (`Needed → Sourcing → Ordered → Received`).
- **Listings**: the ads or shop pages that could supply parts (title, URL, platform, seller, notes, an
  optional agreed total), with a negotiation status (`Found`, `Contacted`, `Negotiating`, `Agreed`,
  `Purchased`, `Received`, `NotResponding`, `Declined`, `Scam`). Any status can follow any other status.
- **Offers**: link one item to one listing with an optional asking and agreed **unit** price and a fit
  status (`Unverified | Fits | NotQuiteRight | WrongItem`). One listing can offer several items (a
  bundle ad). At most one offer per item is chosen, and choosing another offer switches the choice.
- A REST API (`/api/...`) described by an OpenAPI 3.1 contract (`contracts/openapi.yaml`), and an
  Angular UI (project list, project detail, item detail, listing detail) served by the same host.
- The walking skeleton the features need: the backend solution, Aspire AppHost with PostgreSQL 17,
  the Angular app built into the API, and Playwright end-to-end tests.

## Capabilities

### New Capabilities
- `projects`: managing DIY projects and the project cost/status summary.
- `items`: the parts a project needs, their quantity and manual sourcing status.
- `listings`: ads and shop pages that may supply parts, and the negotiation status with the seller.
- `offers`: links between items and listings with per-unit prices, fit status and the chosen offer.

### Modified Capabilities
_None; this is the first change and `openspec/specs/` is empty._

## Non-goals (later changes)

Authentication and multiple users · currency conversion (totals stay per currency) · status history ·
a Seller entity with a scam flag shared across ads · scraping data from ad URLs · attachments and
photos · paging and search · item status derived automatically from offers and listings.

## Impact

- New code: `backend/` (Entities, DAL, BLL, Api, ServiceDefaults, AppHost, and two test projects)
  and `frontend/` (the Angular app with Playwright e2e tests). Neither exists yet.
- New API: every route in `contracts/openapi.yaml`. Both makers are held to it: the backend by a
  contract-drift integration test, and the frontend by types generated from the contract.
- New dependencies: .NET Aspire 13, EF Core 10 + Npgsql, Testcontainers, Angular 22 + Material,
  Vitest, Playwright, openapi-typescript. Docker Desktop is needed for run, integration tests and e2e.
- The AGENTS.md "Build and test commands" section is completed by the skeleton tasks.
