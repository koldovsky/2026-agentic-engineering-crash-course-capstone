# Proposal

## Why

The ETF list page renders a table with sorting and pagination, but gives users no way to narrow
the catalogue by type, region, cost, or text search. `lib/filter.ts` is a stub with failing tests
and `lib/etf-repository.ts` ignores filter params entirely, so F3 (Filters and search) from the
PRD remains unbuilt. Completing this capability lets a user find a handful of matching funds
quickly — the core job-to-be-done the product was designed for.

## What Changes

- Implement `filterEtfs(etfs, query)` in `lib/filter.ts` (text search, multi-select, maxTer).
- Wire filter params from `searchParams` into the `list()` call on the `/etfs` page.
- Add a filter panel component to the `/etfs` page with:
  - Text search input (ticker or name, case-insensitive).
  - Multi-select dropdowns / checkboxes for asset class, region, issuer, and distribution policy.
  - Max TER numeric input / slider.
  - "Reset filters" button that clears all filter + search URL params.
- All filter state lives in the URL (`searchParams`) — every filtered view is a shareable link.
- Changing any filter resets `page` to 1.

## Capabilities

### New Capabilities

- `etf-filters`: Filter panel UI on `/etfs`, `filterEtfs()` pure logic, URL-based filter state,
  and "Reset filters" behaviour.

### Modified Capabilities

- `etf-list`: The list page currently passes no filter params to `list()`. A new requirement
  states it SHALL read filter/search params from `searchParams` and forward them to `list()`,
  so the rendered table reflects the active filters.

## Impact

- `lib/filter.ts` — implement the stub (existing failing tests become the acceptance bar).
- `lib/etf-repository.ts` — `list()` must call `filterEtfs()` before `sortEtfs()` / pagination.
- `app/etfs/page.tsx` — parse filter params from `searchParams`, pass to `list()`.
- New component `components/EtfFilters.tsx` (client component — uses onChange handlers and
  router navigation to update URL params).
- No new dependencies; no schema changes; no breaking changes to existing public API shapes.
