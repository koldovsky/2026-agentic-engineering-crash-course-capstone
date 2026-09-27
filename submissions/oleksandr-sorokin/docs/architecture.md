# Architecture

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Recharts ·
Vitest + Testing Library · Playwright · pnpm · OpenSpec

---

## Routing

| URL | Behaviour |
|---|---|
| `/` | Server redirect → `/etfs` (no render) |
| `/etfs` | List page — Server Component shell, Client Component for filters/table |
| `/etfs/[ticker]` | Details page — Server Component; 404 if ticker unknown |

All filter, sort, and pagination state is in the URL `searchParams`.
No hidden state; every view is bookmarkable.

---

## Data flow

```mermaid
flowchart TD
    Browser -->|HTTP request| NextServer["Next.js App Router\n(Server Component)"]
    NextServer -->|await params / searchParams| PageComponent["Page Component\n(RSC)"]
    PageComponent -->|list(query) / getByTicker(ticker)| Repo["lib/etf-repository.ts"]
    Repo -->|import + Zod parse| Seed["data/etfs.json\n(generated once by\nscripts/generate-seed.mjs)"]
    Repo -->|validated Etf[]| PageComponent
    PageComponent -->|serialised props| ClientShell["'use client' shell\n(EtfTable / EtfFilters /\nDetailChart)"]
    ClientShell -->|URL mutations| Browser
```

---

## Component layers

```
app/
  layout.tsx          Root layout — banner, nav shell
  page.tsx            / → redirect /etfs
  etfs/
    page.tsx          Server Component; reads searchParams; calls repo.list()
    [ticker]/
      page.tsx        Server Component; calls repo.getByTicker(); 404 if null
      not-found.tsx   Minimal styled 404

components/
  ui/                 Primitive wrappers (Button, Badge, Input …) — no logic
  EtfTable.tsx        'use client' — renders rows, emits sort clicks
  EtfFilters.tsx      'use client' — filter controls, writes searchParams
  EtfPagination.tsx   'use client' — page controls
  PriceChart.tsx      'use client' — Recharts LineChart, range selector
  AllocationChart.tsx 'use client' — Recharts BarChart (sector / country)
  HoldingsTable.tsx   Pure display, no client state needed → RSC

lib/
  etf-repository.ts   list(query) / getByTicker(ticker) — no React imports
  filter.ts           filterEtfs() — pure, tested
  sort.ts             sortEtfs() — pure, tested
  format.ts           formatPercent(), formatAum() — pure, tested
  etf-schema.ts       Zod schema — single source of truth for the Etf type

data/
  etfs.json           Generated; committed; never edited by hand

scripts/
  generate-seed.mjs   Deterministic seed → writes data/etfs.json
```

---

## Rendering strategy

- Server Components by default — pages, layout, HoldingsTable.
- `'use client'` only where browser APIs or event handlers are needed:
  filter controls, table sort clicks, URL writes, chart interactions.
- No `'use cache'` in v1 (opt-in only per AGENTS.md).

---

## Key constraints (from AGENTS.md)

- `params`, `searchParams`, `cookies()`, `headers()` are async — always `await`.
- No middleware (`proxy.ts` is the intercept point if needed).
- Filter / sort / page state in URL → no `useState` for those values.
- Pure logic in `lib/` — no React or Next imports there.

---

## External dependencies

| Package | Role | Decision |
|---|---|---|
| `recharts` | Price and allocation charts | ADR-001 |
| `zod` | Runtime data validation | Built into the repository |
| `@testing-library/react` | Component tests | Part of Vitest setup |
| `@playwright/test` | 3 e2e journeys | Quality bar |

No external API calls; no database; no auth.
