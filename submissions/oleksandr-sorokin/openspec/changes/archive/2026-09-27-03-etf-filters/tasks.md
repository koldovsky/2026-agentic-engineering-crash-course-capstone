# Tasks

## 1. Filter logic — `lib/filter.ts`

- [x] 1.1 Write failing tests for `filterEtfs()` — commit red (tests already exist as `it.fails`; convert to `it` and verify `pnpm test` reports them as failing with the stub)
- [x] 1.2 Implement `filterEtfs(etfs, query)` in `lib/filter.ts`: text search (case-insensitive ticker prefix OR name substring), multi-select filters (assetClass, region, issuer, distribution, AND logic), maxTer boundary (inclusive) — verify `pnpm test lib/filter.test.ts` is green

## 2. Repository — wire filters into `list()`

- [x] 2.1 Write a failing test for `list()` that passes a filter query and expects filtered results; commit red — verify `pnpm test lib/etf-repository.test.ts` shows the new test failing
- [x] 2.2 Implement `list()` in `lib/etf-repository.ts`: call `filterEtfs()` before `sortEtfs()` and pagination — verify `pnpm test lib/etf-repository.test.ts` is green

## 3. Filter UI — `EtfFilters` client component

- [x] 3.1 Write a failing component test for `EtfFilters` covering: search input updates URL `search` param on blur/Enter; selecting an asset class updates `assetClass` param; "Reset filters" button removes all filter params; changing any filter removes the `page` param — commit red
- [x] 3.2 Create `components/EtfFilters.tsx` (`'use client'`): text search input (push URL on blur/Enter), multi-select checkboxes for assetClass, region, issuer, distribution, max TER numeric input, "Reset filters" button; uses `useRouter` + `useSearchParams` to read/write URL params — verify component test is green

## 4. List page — forward filter params

- [x] 4.1 Write a failing integration test for `app/etfs/page.tsx` that renders the page with filter `searchParams` and asserts the table shows only matching rows — commit red
- [x] 4.2 Update `app/etfs/page.tsx` to parse `search`, `assetClass`, `region`, `issuer`, `distribution`, `maxTer` from `searchParams` and pass them to `list()`; render `<EtfFilters>` above the table — verify integration test is green

## 5. Verification

- [x] 5.1 Run `pnpm check` and confirm exit code 0 with all tests passing; quote the test count
- [x] 5.2 Start `pnpm dev` and manually verify: search input filters the list; multi-select checkboxes work; Reset filters button clears all params; URL updates on every change; page reloading with filter params shows the same filtered view
