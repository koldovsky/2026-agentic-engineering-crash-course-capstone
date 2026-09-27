# ADR-001 — Stack

**Date:** 2026-09-26  
**Status:** accepted  
**Decider:** Alex

---

## Context

Need a stack for a small demo web app (ETF list + details) that:

- renders well on mobile (375 px) and desktop;
- keeps filter / sort / page state in the URL for shareable links;
- has a good charting option for a price line chart;
- is teachable — the project is also a capstone for an agentic engineering course.

---

## Decision

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router | 16 |
| UI library | React | 19 |
| Language | TypeScript | ~5.x |
| Styling | Tailwind CSS | 4 |
| Charts | Recharts | latest stable |
| Validation | Zod | 3 |
| Unit tests | Vitest + Testing Library | latest |
| E2E tests | Playwright | latest |
| Package manager | pnpm | 9+ |
| Spec tool | OpenSpec | installed in Step 4 |

---

## Recharts

Recharts was chosen over Victory, Chart.js, and Nivo for these reasons:

- Native React component API — no imperative setup.
- Active repository: weekly releases, >23 k GitHub stars, maintained by a small but responsive team.
- Straightforward `LineChart` and `BarChart` primitives map directly to the price and allocation
  charts needed here.
- Bundle size is acceptable for a non-production demo app.

**Risk:** the API surface is larger than needed; only `LineChart`, `BarChart`, `Tooltip`, and
`ResponsiveContainer` are used. If the library becomes a burden, the charts are isolated in
`components/PriceChart.tsx` and `components/AllocationChart.tsx` — swapping is a two-file change.

---

## Consequences

- `params`, `searchParams`, `cookies()`, `headers()` are async in Next.js 16 — every page component
  must `await` them (AGENTS.md rule).
- Server Components by default; `'use client'` only for event handlers, browser APIs, URL writes.
- No `'use cache'` in v1.
- No middleware (`proxy.ts` pattern if needed later).
- `lib/` is pure TypeScript — no React or Next imports.

---

## Alternatives considered

| Alternative | Reason not chosen |
|---|---|
| Vite + React SPA | URL-based state would work, but no built-in routing or SSR |
| Remix | Less familiar; similar benefits to Next.js App Router |
| shadcn/ui | Adds a component library dependency; Tailwind alone is sufficient for this scope |
| Victory / Chart.js | Less idiomatic React API; Recharts is a better fit |
