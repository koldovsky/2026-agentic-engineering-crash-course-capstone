# Design

## Context

The list page and all library code are in place (`lib/etf-repository.ts` exposes `getByTicker()`,
`recharts` is already a dependency). The details page is the only major route still unimplemented.
See [proposal.md](proposal.md) for motivation.

## Goals / Non-Goals

**Goals:**
- Implement `/etfs/[ticker]` as a Server Component that delegates interactive sections to client components.
- Keep filter/sort state round-trippable via a `ref` query parameter.
- Reuse the existing Tailwind design tokens and KPI card patterns established in the list page.

**Non-Goals:**
- No new npm dependencies.
- No server-side caching (`'use cache'` is opt-in and not used in v1).
- No real-time price updates; chart data comes from the static seed.

## Decisions

### D1 — Page is a Server Component; charts are Client Components

`app/etfs/[ticker]/page.tsx` awaits `params`, calls `getByTicker()`, and calls `notFound()` on
null. It then renders `PriceChart` and `AllocationChart` as client components (they need
`useState` for range selection and Recharts interaction) and `HoldingsTable` as a Server Component
(pure display, no interactivity needed).

Alternatives considered: making the whole page a client component would require an API route for
data; that adds complexity for no gain.

### D2 — `ref` parameter carries the back-link URL

`EtfTable` receives the current page's URL (pathname + search) as a prop from the Server Component
page, encodes it, and appends `?ref=<encoded>` to each row href. The details page reads this from
`searchParams` and passes it to the "Back to list" link; it falls back to `/etfs`.

Alternatives considered: using `document.referrer` on the client — unreliable across tab opens and
direct navigations.

### D3 — Recharts horizontal `BarChart` for allocations

The PRD and design doc specify horizontal bars for sector/country because they are easier to read
on narrow viewports with many category labels. `recharts` `layout="vertical"` with `XAxis type="number"` and `YAxis type="category"` produces this.

### D4 — Range selector is purely client-side state

The 1M / 6M / 1Y tab selection slices the prices array in the client component. The full 252-point
array is passed as a prop from the Server Component; the client holds `rangeKey` in `useState` and
derives the visible slice. No URL param is needed for range (it is an ephemeral view preference, not a shareable filter).

## Risks / Trade-offs

- [Risk] Recharts renders nothing during SSR → chart containers show blank on first paint.
  Mitigation: client components handle this via their loading/hydration cycle; add a `min-h` CSS
  class so the layout does not shift when charts mount.
- [Risk] A very long ETF name or many sector labels could overflow the allocation chart.
  Mitigation: truncate long labels with CSS `text-overflow: ellipsis`; Recharts' `YAxis` `width`
  prop can be fixed to a safe value.

## Open Questions

None — all decisions are resolved.
