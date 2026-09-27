# Proposal

## Why

The app currently has no usable UI — the home page shows the Next.js scaffold. F2 from the PRD
calls for a `/etfs` list page where a retail investor can browse, sort, and paginate the demo
ETF data set. This is the first visible feature and the foundation every other page builds on.

## What Changes

- `app/page.tsx` replaces the scaffold with a server-side redirect to `/etfs`.
- `app/etfs/page.tsx` (new) — Server Component that reads `searchParams`, calls `repo.list()`,
  and renders the list shell (table, pagination, "Showing X–Y of N" count).
- `app/layout.tsx` — add persistent top bar and full-width disclaimer banner.
- `components/EtfTable.tsx` (new) — `'use client'` component; renders rows and emits sort clicks
  via URL navigation.
- `components/EtfPagination.tsx` (new) — `'use client'` component; page controls via URL.
- Sort and page state stored in URL `searchParams`; every view is a shareable link.

## Capabilities

### New Capabilities

- `etf-list`: The `/etfs` list page — redirect from `/`, table with 8 columns, sort by any
  column, 20-row pagination with "Showing X–Y of N" count, empty state with "clear filters"
  prompt, and disclaimer banner on every page.

### Modified Capabilities

*(none — the `etf-data` spec covers the repository; its requirements are unchanged.)*

## Impact

- New files: `app/etfs/page.tsx`, `components/EtfTable.tsx`, `components/EtfPagination.tsx`.
- Modified files: `app/page.tsx` (redirect), `app/layout.tsx` (top bar + banner).
- No new dependencies; no schema changes; no external API calls.
- `lib/etf-repository.ts`, `lib/filter.ts`, `lib/sort.ts` consumed read-only.
