# Tasks

## 1. Failing tests (spec scenarios → red tests)

- [x] 1.1 Write failing tests in `app/etfs/[ticker]/page.test.tsx` for: known ticker renders all page sections, unknown ticker renders not-found, back link uses `ref` param, back link falls back to `/etfs` — verify `pnpm test` runs and all new tests fail (no implementation yet)
- [x] 1.2 Write failing tests in `components/HoldingsTable.test.tsx` for: table renders rank, name, and weight for each holding; column headers have `scope="col"` — verify new tests fail
- [x] 1.3 Write failing tests in `components/PriceChart.test.tsx` for: default range is 1Y; selecting 1M filters the data; chart container has `role="img"` and `aria-label` — verify new tests fail
- [x] 1.4 Write failing tests in `components/AllocationChart.test.tsx` for: sector chart renders bar per sector; country chart renders bar per country — verify new tests fail
- [x] 1.5 Write failing test in `components/EtfTable.test.tsx` for: row href includes `?ref=` encoding the current list URL — verify new test fails

## 2. `HoldingsTable` component

- [x] 2.1 Create `components/HoldingsTable.tsx` as a Server Component rendering a table with rank, name, and weight columns; column headers have `scope="col"` — verify `components/HoldingsTable.test.tsx` passes

## 3. `PriceChart` component

- [x] 3.1 Create `components/PriceChart.tsx` as a `'use client'` component wrapping a Recharts `LineChart`; accepts a `prices` prop (all 252 points) and `ticker`; renders 1M / 6M / 1Y tabs using `useState`; chart container has `role="img"` and `aria-label="Price chart for [TICKER]"` — verify `components/PriceChart.test.tsx` passes

## 4. `AllocationChart` component

- [x] 4.1 Create `components/AllocationChart.tsx` as a `'use client'` component wrapping a horizontal Recharts `BarChart`; accepts `data` (array of `{label, weight}`) and `title` props; renders each entry as a bar proportional to weight — verify `components/AllocationChart.test.tsx` passes

## 5. Details page and 404

- [x] 5.1 Create `app/etfs/[ticker]/page.tsx` as a Server Component: `await params`, call `getByTicker()`, call `notFound()` on null; render header (name, ticker, issuer badge, asset class, region, distribution policy), KPI cards (TER, AUM, 1Y/3Y/5Y return, volatility, inception date), `PriceChart`, `HoldingsTable`, and two `AllocationChart` instances (sectors and countries); read `ref` from `searchParams` and pass to the "Back to list" link — verify `app/etfs/[ticker]/page.test.tsx` passes
- [x] 5.2 Create `app/etfs/[ticker]/not-found.tsx` showing "ETF not found" and a "Back to list" link to `/etfs`; the disclaimer banner is rendered via the root layout — verify the unknown-ticker test passes and `pnpm typecheck` exits 0

## 6. Update `EtfTable` with `ref` parameter

- [x] 6.1 Update `components/EtfTable.tsx` to accept a `currentUrl` prop (the encoded current page URL) and append `?ref=<encoded>` to each row's `href`; update `app/etfs/page.tsx` to pass the current pathname + search as `currentUrl` — verify `components/EtfTable.test.tsx` passes including the new ref test

## 7. Format utilities

- [x] 7.1 Add `formatAum()` export to `lib/format-aum.ts` if not already present (abbreviated $B/$M form) and `formatDate()` to `lib/format-percent.ts` or a new `lib/format-date.ts`; add unit tests for both — verify `pnpm test` stays green

## 8. Integration check

- [x] 8.1 Run `pnpm check` and confirm exit 0; record the test count; confirm the details page renders at `http://localhost:3000/etfs/IWDA` (or any seeded ticker) with all sections visible and the "Back to list" link pointing to `/etfs` when no `ref` is present
