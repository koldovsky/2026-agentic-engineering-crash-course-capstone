# Design

## Context

The repository layer (`lib/etf-repository.ts`) already exists and is tested. `lib/filter.ts`
and `lib/sort.ts` are pure functions with unit tests. The list page is the first UI and must
establish patterns (URL-driven state, Server Component shell + client interaction) that later
features (F3 filters, F4 details) will follow.

## Goals / Non-Goals

**Goals:**
- Render the `/etfs` list using existing repo/filter/sort functions.
- Establish the URL-searchParams pattern for sort and page state.
- Add the persistent top bar and disclaimer banner to the root layout.
- Keep all logic testable: unit tests for formatters; rendering tests for components.

**Non-Goals:**
- Text search and multi-select filter controls (F3 — separate change).
- ETF details page (F4).
- Playwright e2e tests (may come with F3 or a separate chore change).

## Decisions

### Server Component shell with `'use client'` islands

`app/etfs/page.tsx` is a Server Component: it awaits `searchParams`, calls `repo.list()`, and
passes the serialised result as props to the client components. Sort clicks and pagination are
handled in `EtfTable` and `EtfPagination` (`'use client'`), which write to the URL via
`useRouter` / `useSearchParams`. This matches the architecture doc's layering and keeps the
data fetch on the server.

Alternative considered: fully client-side with `useEffect + fetch`. Rejected — adds a loading
spinner, requires a route handler, and misses the server-rendering opportunity.

### URL as the only source of truth for sort and page

`sortBy`, `sortDir`, and `page` live exclusively in `searchParams`. No `useState` for these
values. Any view is bookmarkable and shareable. Default values (`sortBy=name`, `sortDir=asc`,
`page=1`) are applied in `app/etfs/page.tsx` when the corresponding param is absent.

### Layout-level disclaimer banner

The banner and top bar go in `app/layout.tsx` so they appear on every page (including the
future details page) without duplication. The existing layout wraps `{children}` in a flex
column; the banner and nav are prepended inside the body wrapper.

### Format helpers

`lib/format-percent.ts` already exists. A new `lib/format-aum.ts` will format AUM values
(e.g. `$12.4B`, `$980M`) for display. Pure function, Vitest unit test alongside.

## Risks / Trade-offs

- **Horizontal scroll on mobile**: 8 columns will not fit on 375 px without scroll. The table
  wrapper will be `overflow-x-auto` on mobile, matching the design doc.
- **No skeleton loading state in v1 list**: The page is a Server Component — data is fetched
  before the HTML is sent. A loading skeleton is not needed for the initial render; it becomes
  relevant only if we add client-side refetch, which is out of scope here.
- **Sort only by the 8 visible columns**: The data model supports more sort fields
  (`return3y`, `return5y`, `volatility1y`). Only the 8 table columns are sortable in this
  change; the rest are available via `sortBy` URL param but not exposed as column headers.
