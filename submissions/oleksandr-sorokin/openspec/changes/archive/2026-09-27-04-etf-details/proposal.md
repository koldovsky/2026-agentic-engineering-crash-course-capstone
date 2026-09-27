# Proposal

## Why

The list page lets a user find an ETF, but there is no page to actually read about it. Implementing
the `/etfs/[ticker]` details page completes the core browse-and-inspect loop defined in F4 of the
PRD and makes every list-row link functional.

## What Changes

- New route `app/etfs/[ticker]/page.tsx` — Server Component that fetches a single ETF by ticker
  and renders the full details page; calls `notFound()` for an unknown ticker.
- New file `app/etfs/[ticker]/not-found.tsx` — styled 404 page with a "Back to list" button.
- New component `components/PriceChart.tsx` (`'use client'`) — Recharts `LineChart` with 1M / 6M /
  1Y range tabs; accessible with `role="img"` and `aria-label`.
- New component `components/AllocationChart.tsx` (`'use client'`) — horizontal Recharts `BarChart`
  used for sector weights and country weights.
- New component `components/HoldingsTable.tsx` — Server Component table of up to 10 holdings with
  rank, name, and weight columns.
- "Back to list" link on the details page that preserves the referring filter/sort URL via the
  `ref` query parameter passed from the list page (or falls back to `/etfs`).
- The list-page row links are updated to append `?ref=<encoded current URL>` so the back-link
  round-trips the filter state.

## Capabilities

### New Capabilities

- `etf-details`: ETF details page at `/etfs/[ticker]` — header, KPI cards, price chart with range
  selector, top-10 holdings table, sector and country allocation charts, and a styled 404 for
  unknown tickers.

### Modified Capabilities

- `etf-list`: Row links updated to append `?ref=<encoded current URL>` so the details page can
  return to the exact filtered view.

## Impact

- New files: `app/etfs/[ticker]/page.tsx`, `app/etfs/[ticker]/not-found.tsx`,
  `components/PriceChart.tsx`, `components/AllocationChart.tsx`, `components/HoldingsTable.tsx`.
- Test files: `app/etfs/[ticker]/page.test.tsx`, `components/PriceChart.test.tsx`,
  `components/AllocationChart.test.tsx`, `components/HoldingsTable.test.tsx`.
- `components/EtfTable.tsx` updated to add `?ref=` to each row's href.
- No new dependencies — `recharts` is already installed.
- No schema or data changes.
