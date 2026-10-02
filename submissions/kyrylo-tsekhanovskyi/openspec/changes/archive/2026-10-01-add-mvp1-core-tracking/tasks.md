Ownership by heading:
- **Shared**: the orchestrator, sequentially (walking skeleton in phase 3; e2e and docs in phase 5).
- **Backend**: `be-maker`, writes only `backend/`.
- **Frontend**: `fe-maker`, writes only `frontend/`.

A `[checks]` task writes the tests for the listed scenarios (`capability: scenario title`). Test names
repeat those titles (design D7). The red run is `npm run check:<be|fe|e2e> -- --red <id>`, which saves
`evidence/<id>-red.txt`. Do not tick a `[checks]` task without its evidence file.

## 1. Shared: walking skeleton

- [x] 1.1 Scaffold `backend/BOMKeeper.slnx`, with no project references yet:
  - projects: Entities, DAL, BLL, Api, ServiceDefaults, AppHost, BLL.Tests and Api.IntegrationTests;
  - `Directory.Build.props` (Nullable, ImplicitUsings, TreatWarningsAsErrors, `AnalysisLevel=latest-recommended`, EnforceCodeStyleInBuild) and `.editorconfig`.

  Verify: `dotnet build backend/BOMKeeper.slnx -warnaserror` succeeds.
- [x] 1.2 [checks] Tests for the backend skeleton:
  - an architecture test for the reference direction: Entities ← DAL ← BLL ← Api; the Api uses DAL only for DI; the AppHost references only the Api and ServiceDefaults (BLL.Tests);
  - `GET /api/health` returns 200 through WebApplicationFactory + Testcontainers `postgres:17` with migrations applied (Api.IntegrationTests).

  Red run saved.
- [x] 1.3 Implement the backend skeleton:
  - the project references;
  - ServiceDefaults and the AppHost (design D1, ADR 0005);
  - the DbContext, with an initial migration applied on startup in Development;
  - `/api/health`, and the ProblemDetails + `IExceptionHandler` skeleton (design D4);
  - OpenAPI at `/openapi/v1.json`;
  - static files + `MapFallbackToFile("index.html")`, excluding `/api/**`.

  Verify: the 1.2 tests pass and `npm run check:be` is green.
- [x] 1.4 Scaffold `frontend/` with the `angular-new-app` skill (Angular 22.2, standalone, SCSS, Vitest). Then:
  - add Angular Material, angular-eslint and Prettier;
  - add the npm scripts `lint`, `format:check`, `test` (single run), `build` (output to `../backend/src/BOMKeeper.Api/wwwroot`), `generate:api` and `e2e`;
  - add `proxy.conf.json` for `/api`.

  Verify: `npm --prefix frontend run build` writes `index.html` into the Api `wwwroot`.
- [x] 1.5 [checks] App shell spec: a toolbar with the app name "BOMKeeper" and a router outlet, and `/` redirects to `/projects` (FE). Red run saved.
- [x] 1.6 Implement the app shell and the routes `/projects`, `/projects/:projectId`, `/items/:itemId` and `/listings/:listingId` (placeholder pages).
  - Generate `src/app/api/schema.d.ts` from `contracts/openapi.yaml` with `openapi-typescript`.
  - Add a staleness step to `check:fe` (`generate:api`, then fail on any diff).

  Verify: `npm run check:fe` is green.
- [x] 1.7 Extend the harness for e2e red runs: `scripts/check.mjs --red` gets an `e2e` side (Playwright), with a `check:e2e` npm script, and `scripts/lib/red.mjs` recognises the Playwright summary and `expect(...)` failures. Write the tests first, in `scripts/test/red.test.mjs`. Verify: `npm run check:harness` is green.
- [x] 1.8 [checks] Playwright smoke test "app loads": with the stack started by the AppHost, `/` shows the shell and the page title is "BOMKeeper" (E2E). Red run saved.
- [x] 1.9 Configure Playwright: Chromium, the base URL of the running Api, and a global setup that waits for `/api/health`. Verify: `npm run e2e` passes with the stack started by `npm run start`.
- [x] 1.10 Fill in "Build and test commands" in AGENTS.md (dotnet, npm, `dotnet ef migrations add`). Verify: `npm run check` is green end to end with Docker running.

## 2. Backend: projects

- [x] 2.1 [checks] Tests (BLL, API) for:
  - projects: Create a project;
  - projects: Reject a blank or too long name;
  - projects: Get a project;
  - projects: Update a project;
  - projects: Validation error shape;
  - projects: Unknown id.

  Red run saved.
- [x] 2.2 Implement:
  - the Project entity (with the `seq` identity column, design D2), its EF configuration and migration, and its repository;
  - the projects service (validation, `TimeProvider`);
  - the projects controller: `listProjects` (counts 0 for now), `createProject`, `getProject`, `updateProject`, `deleteProject`;
  - the 400/404 problem-details mapping.

  Verify: the 2.1 tests pass and `npm run check:be` is green.
- [x] 2.3 Refactor. Verify: `npm run check:be` is still green.

## 3. Backend: items

- [x] 3.1 [checks] Tests (BLL, API) for:
  - items: Add an item;
  - items: Reject an invalid quantity;
  - items: Reject a blank name;
  - items: Unknown project;
  - items: Update an item;
  - items: Order is kept for rapid additions;
  - items: Any status transition is allowed;
  - items: Set status through the API;
  - items: Unknown status value.

  Red run saved.
- [x] 3.2 Implement:
  - the Item entity and migration (cascade from Project; the `seq` identity column for ordering, design D2) and its repository;
  - the items service;
  - the items controller: `listProjectItems` (`chosenOffer` null for now), `createItem`, `getItem`, `updateItem`, `deleteItem`, `setItemStatus`.

  Verify: the 3.1 tests pass and `npm run check:be` is green.
- [x] 3.3 Refactor. Verify: `npm run check:be` is still green.

## 4. Backend: listings

- [x] 4.1 [checks] Tests (BLL, API) for:
  - listings: Add a listing;
  - listings: Reject an invalid URL;
  - listings: List listings;
  - listings: Editing fields keeps the status time;
  - listings: Update a listing;
  - listings: Any transition is allowed;
  - listings: Setting the same status keeps the time;
  - listings: Set status through the API;
  - projects: List projects with counts.

  Red run saved.
- [x] 4.2 Implement:
  - the Listing entity and migration (cascade from Project; `seq`; money as a complex value, design D2) and its repository;
  - the listings service (status time rules; money validation shared with offers);
  - the listings controller: `listProjectListings`, `createListing`, `getListing`, `updateListing`, `deleteListing`, `setListingStatus`;
  - the project counts in `listProjects`.

  Verify: the 4.1 tests pass and `npm run check:be` is green.
- [x] 4.3 Refactor. Verify: `npm run check:be` is still green.

## 5. Backend: offers and rules

- [x] 5.1 [checks] Tests (BLL, API) for:
  - offers: Create an offer;
  - offers: A bundle listing supplies two items;
  - offers: Listing from another project;
  - offers: Rule violation over HTTP;
  - offers: Duplicate link;
  - offers: Duplicate link over HTTP;
  - offers: Reject a negative amount;
  - offers: Reject an invalid currency code;
  - offers: Reject an unknown currency code;
  - offers: Reject more than two decimal places;
  - offers: Update prices;
  - offers: Offers of an item;
  - offers: Offers of a listing;
  - offers: Set fit through the API.

  Red run saved.
- [x] 5.2 Implement:
  - the Offer entity and migration (cascades from Item and Listing; `seq`; a unique index on item + listing);
  - the offers service (same-project and duplicate rules → `BusinessRuleException`);
  - the offers controller: `createOffer`, `listItemOffers`, `listListingOffers`, `updateOffer`, `deleteOffer`, `setOfferFit`;
  - the 409 mapping to `/problems/<code>`.

  Verify: the 5.1 tests pass and `npm run check:be` is green.
- [x] 5.3 [checks] Tests (BLL, API) for:
  - offers: Choosing switches the choice;
  - offers: Choice is per item;
  - offers: Un-choose an offer;
  - offers: Switching back and forth;
  - offers: Choose through the API;
  - offers: Delete an offer;
  - items: Choosing an offer does not change the item status;
  - items: List items with chosen offers;
  - items: Delete an item and its offers;
  - listings: Delete a listing, keep the items;
  - projects: Delete a project and its data.

  Red run saved.
- [x] 5.4 Implement:
  - `setOfferChoice` with auto-switch as ordered writes in one transaction (clear, then set), backed by a partial unique index on `item_id WHERE is_chosen` (design D2, D3);
  - `chosenOffer` in item responses;
  - checks that the cascades behave as specified.

  Verify: the 5.3 tests pass and `npm run check:be` is green.
- [x] 5.5 Refactor. Verify: `npm run check:be` is still green.
- [x] 5.6 [checks] Tests (BLL) for offers: Reject special currency codes (added by the human's decision of 2026-09-30). Red run saved.
- [x] 5.7 Remove the special ISO 4217 codes from the BLL currency list (design D3), with a comment naming the decision. Verify: the 5.6 tests pass and `npm run check:be` is green.

## 6. Backend: project summary

- [x] 6.1 [checks] Tests (BLL, API) for:
  - projects: Counts by status include zeros;
  - projects: Total uses agreed price over asking price, times quantity;
  - projects: Totals are kept per currency;
  - projects: Totals may exceed the single-price limit;
  - projects: Missing choices and prices are reported;
  - projects: Summary endpoint.

  Red run saved.
- [x] 6.2 Implement the summary service and `getProjectSummary` (design D3). Verify: the 6.1 tests pass and `npm run check:be` is green.
- [x] 6.3 Refactor. Verify: `npm run check:be` is still green.

## 7. Backend: contract drift

- [x] 7.1 [checks] Unit tests for the OpenAPI normalizer on small fixtures (design D5).
  - **Reported:**
    - a missing path or method;
    - a changed `operationId`, enum, `required` set or property type;
    - a changed `minimum`, `maximum`, `minLength`, `maxLength` or `pattern`;
    - a changed array `items` schema or `additionalProperties`;
    - a changed request or response media type;
    - a missing `Location` header on a `201`.
  - **Ignored:**
    - nullability spelled three ways (`type: [x, null]`, `oneOf` with null, `nullable: true`);
    - differences in `format`, `multipleOf`, descriptions, summaries, tags, `servers`, `security` and key order;
    - `/api/health`.

  Add the drift test that compares `/openapi/v1.json` with `contracts/openapi.yaml` (Api.IntegrationTests). Red run saved.
- [x] 7.2 Implement the normalizer and the comparer. Fix any drift **in the code**; if the contract itself looks wrong, stop and escalate. Verify: the drift test passes and `npm run check:be` is green.
- [x] 7.3 Refactor. Verify: `npm run check:be` is still green.

## 8. Frontend: API services

- [x] 8.1 [checks] `HttpTestingController` specs for the projects, items, listings and offers services:
  - every contract operation uses the right method, URL and body;
  - a `400` problem details response is mapped to field errors;
  - a `409` problem details response is mapped to its rule code (FE).

  Red run saved.
- [x] 8.2 Implement the typed services with the generated `schema.d.ts` types and a shared problem-details mapper. Verify: the 8.1 specs pass and `npm run check:fe` is green.
- [x] 8.3 Refactor. Verify: `npm run check:fe` is still green.

## 9. Frontend: project list

- [x] 9.1 [checks] Specs (FE) for:
  - projects: Create a project from the UI;
  - projects: Empty project list;
  - projects: Confirm before deleting.

  Red run saved.
- [x] 9.2 Implement the project list page: a Material list, the "New project" dialog and the delete confirmation. Verify: the 9.1 specs pass and `npm run check:fe` is green.
- [x] 9.3 Refactor. Verify: `npm run check:fe` is still green.

## 10. Frontend: project detail

- [x] 10.1 [checks] Specs (FE) for:
  - items: Items table;
  - items: Change status from the items table;
  - listings: Listings tab;
  - listings: Platform suggestions with free text;
  - projects: Summary card on the project page.

  Red run saved.
- [x] 10.2 Implement the project detail page: the "Items" and "Listings" tabs, the item and listing dialogs (showing server field errors) and the summary card. Verify: the 10.1 specs pass and `npm run check:fe` is green.
- [x] 10.3 Refactor. Verify: `npm run check:fe` is still green.

## 11. Frontend: item detail

- [x] 11.1 [checks] Specs (FE) for:
  - offers: Link a listing from the item page;
  - offers: Choose an offer from the item page;
  - offers: Wrong items are visible.

  Red run saved.
- [x] 11.2 Implement the item detail page:
  - the offer list;
  - the "Add offer" dialog with a picker of the project's listings;
  - price editing;
  - the fit menu;
  - choose and un-choose.

  Verify: the 11.1 specs pass and `npm run check:fe` is green.
- [x] 11.3 Refactor. Verify: `npm run check:fe` is still green.

## 12. Frontend: listing detail

- [x] 12.1 [checks] Specs (FE) for:
  - listings: Change status on the listing page;
  - listings: Offers across items.

  Red run saved.
- [x] 12.2 Implement the listing detail page: its fields, the status selector with the status time, and the offers across items. Verify: the 12.1 specs pass and `npm run check:fe` is green.
- [x] 12.3 Refactor. Verify: `npm run check:fe` is still green.

## 13. Shared: end-to-end and docs

- [x] 13.1 [checks] Playwright flow for projects: From project to total (E2E). Red run saved.
- [x] 13.2 Make the flow pass against the stack started by the AppHost. Fix gaps only within the specified behaviour. Verify: `npm run e2e` passes.
- [x] 13.3 Write the README run instructions and `docs/architecture.md`. Verify: the app can be started from the README alone on a clean clone.
- [x] 13.4 Verify the MVP-1 definition of done in `docs/plan-mvp1.md`:
  - `npm run check` and `npm run e2e` pass;
  - the manual "Solar station" scenario works;
  - the pre-commit hook blocks a commit with a failing test once.

  Then run `openspec archive add-mvp1-core-tracking`. Verify: `openspec validate --all --strict` passes and `openspec/specs/` holds projects, items, listings and offers.

## 14. Backend: review fixes

Findings of `docs/reviews/2026-09-30-be-be-checker.md` (all P2). Each [checks] task lists findings, not spec scenarios.

- [x] 14.1 [checks] Tests for the findings:
  - choosing an offer when the transaction fails transiently after a save and before the commit: the retried operation rebuilds its tracked state, so the response and the database agree (API);
  - two concurrent `POST /api/items/{itemId}/offers` for the same listing: one `201` and one `409` with type `/problems/duplicate-offer`, never a `500` (API);
  - normalizer fixtures: a nullable union (`oneOf` with null) whose sibling `maxLength`, `minimum` or `pattern` differs is reported (API).

  Red run saved.
- [x] 14.2 Implement:
  - each retry attempt of the unit of work starts from fresh tracked state;
  - a unique-index violation on offer(item, listing) is translated through the DAL into `BusinessRuleException("duplicate-offer")`;
  - the normalizer keeps a nullable wrapper's constraints.

  Verify: the 14.1 tests pass and `npm run check:be` is green.

## 15. Frontend: review fixes

Findings of `docs/reviews/2026-09-30-fe-fe-checker.md` (all P2). Each [checks] task lists findings, not spec scenarios.

- [x] 15.1 [checks] Specs (FE) for the findings:
  - the project, item and listing detail pages reload when the route id changes, and ignore a superseded response;
  - on the item page, a failed offers load stays visible when the item load succeeds later;
  - a detail page destroyed before its delete response arrives neither navigates nor reloads;
  - the listing status selector shows the persisted status again after a failed PATCH;
  - clearing the amount of an optional price makes the dialog valid, even with a stale or partial currency;
  - item, listing and offer collections show a loading state while pending, and the empty message only after a successful empty response.

  Red run saved.
- [x] 15.2 Implement the fixes. Verify: the 15.1 specs pass and `npm run check:fe` is green.

## 16. Frontend: UI polish

Findings of the orchestrator's visual review of 2026-10-01 (the screens worked, but looked unfinished). Each [checks] task lists findings, not spec scenarios.

- [x] 16.1 [checks] Specs (FE) for the findings:
  - the app toolbar has its own container background, distinct from the page;
  - listing status is changed with a Material select (`mat-select`), not a native `<select>`;
  - item status, listing status and fit chips carry a per-value class (e.g. `status-ordered`, `listing-scam`, `fit-wrong-item`) that maps to distinct theme colors, and clickable status chips show a dropdown icon;
  - the offer card labels its chips ("Listing: Found", "Fit: Fits");
  - the item page shows "Quantity: 1" with no dangling separator and labels the notes;
  - destructive actions (delete project/item/listing/offer) are styled as destructive and differ from edit actions;
  - a listing URL is shown as a short "Open ad" link with the host name (new tab, `rel="noopener"`), not the full URL;
  - the status time is shown without seconds;
  - the offer tables use short column headers ("Asking", "Agreed") with the unit meaning in the header's tooltip or caption;
  - the listing picker in "Add offer" has a label that is not truncated.

  Red run saved.
- [x] 16.2 Implement the polish:
  - global styles in `styles.scss` built on Material system tokens: app bar, link style, chip colors;
  - a Material select for the listing status;
  - the labels, header and URL changes above;
  - on narrow widths, no truncated project meta and no three-line table headers.

  Verify: the 16.1 specs pass, `npm run check:fe` is green, and `npm run screens` shows the fixes at phone and desktop width.

## 17. Shared: visual review

- [x] 17.1 `npm run screens`: a Playwright capture of the project list, the project detail (both tabs), the item detail, the listing detail and the "Add offer" dialog, at phone (390 px) and desktop (1280 px) width, against the running stack. It uses its own temporary demo project, created through the API and deleted afterwards, and writes to `evidence/screens/`. It is not part of `npm run e2e`. Verify: all screenshots are written, and the demo project is gone afterwards.
- [x] 17.2 Review the screenshots after section 16: the orchestrator, then the human. Findings are fixed or recorded in `docs/logs/reviews.md` as a "visual" review row.

## 18. Frontend: visual review fixes

Findings of `docs/reviews/2026-10-01-fe-visual-orchestrator.md` (1×P2, 4×P3). Each [checks] task lists findings, not spec scenarios.

- [x] 18.1 [checks] Specs (FE) for the findings:
  - at phone width (narrow layout), the project's listings and the listing's offers render so that status and fit stay visible without horizontal scrolling;
  - status and fit values are shown with human labels ("Wrong item", "Not quite right", "Not responding"), both in chips and in selects;
  - the project list pluralizes correctly ("1 listing", "1 item");
  - the listing page shows its status once (the select), not a duplicate chip;
  - the four item statuses have distinct chip classes or tones.

  Red run saved.
- [x] 18.2 Implement the fixes. Verify: the 18.1 specs pass, `npm run check:fe` is green, and the orchestrator re-runs `npm run screens` and reviews phone + desktop.
- [x] 18.3 Phone-only CSS leftovers from the second visual pass: the "Prices are per unit of the item." caption is squeezed into a one-word-wide column above the stacked offers, and short stray dashes appear at the left edge of the stacked listing rows. CSS-only, with no testable behaviour. Verify: `npm run check:fe` is green and the orchestrator's `npm run screens` phone screenshots are clean.

## 19. Frontend: dialog layout and spacing

Findings of the human visual review (`docs/reviews/2026-10-01-fe-visual-human.md`, 2×P2). Each [checks] task lists findings, not spec scenarios.

- [x] 19.1 [checks] Specs (FE) for the dialog structure:
  - every create/edit dialog (project, item, listing, offer, offer prices) renders its fields in one `.dialog-form` column, in the documented order;
  - only an amount and its currency share a `.form-row`;
  - every dialog uses the shared dialog width;
  - the project list page puts its list in a section separated from the heading row (`.page-header` + content).

  Red run saved.
- [x] 19.2 Implement:
  - a shared dialog form style: one column of full-width fields, a 16 px vertical gap, rows aligned to the top so hints and errors never shift neighbours, and amount + currency on one row (currency narrow);
  - one dialog width for all dialogs (about 560 px, full width on phones);
  - consistent `.page-header` spacing (heading and action, then a 16–24 px gap) on all pages.

  Verify: `npm run check:fe` is green.
- [x] 19.3 (Shared, orchestrator) Extend `npm run screens` with the new project, edit project, add item, add listing, add offer and edit prices dialogs, and a third viewport `wide` (2048 px). Then re-run it and review all screens. Verify: the dialogs and the wide viewport appear in `evidence/screens/`, and the visual review row is resolved.
- [x] 19.4 Dialog spacing with validation hints: when a field shows its hint or error ("Required."), the text eats the 16 px row gap and nearly touches the next field (`evidence/screens/desktop-10-add-listing-dialog-errors.png`, `phone-10-…`). Keep a visible gap below the hint, the same rhythm with and without errors. CSS-only. Verify: `npm run check:fe` is green and the orchestrator's `npm run screens` shows even spacing in dialog 10 at all widths.
