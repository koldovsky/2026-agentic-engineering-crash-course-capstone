# Design

## Context

The `/etfs` page already sorts and paginates via `lib/sort.ts` and `lib/etf-repository.ts`, but
`lib/filter.ts` is a stub and `app/etfs/page.tsx` does not forward filter params to `list()`.
See proposal.md — Why for motivation.

## Goals / Non-Goals

**Goals**
- Implement `filterEtfs()` in `lib/filter.ts` so failing tests pass.
- Wire filter params through `page.tsx` → `list()` → `filterEtfs()`.
- Add `EtfFilters` client component that updates URL params on every filter change.

**Non-goals**
- No server-side filtering beyond what `list()` already does.
- No debounce beyond what the browser provides (no extra library).
- No multi-sort, saved filters, or filter presets (v2 candidates).

## Decisions

### D1: Filter logic lives entirely in `lib/filterEtfs()`
All filter predicates are pure functions in `lib/filter.ts`. `list()` in `etf-repository.ts`
calls `filterEtfs()` before `sortEtfs()` and pagination.

**Why over server actions or API routes:** the data set is small (≤ 100 ETFs, in-memory JSON).
Client-side filtering on a server component page is the simplest path that keeps every view
as a shareable URL without any fetch round-trips.

**Alternative considered:** fetch a filtered subset from a Route Handler (`/api/etfs`). Rejected
because it adds network latency and complicates URL-driven state with no benefit at this scale.

### D2: Filter UI is a `'use client'` component that pushes URL params via `useRouter`
`EtfFilters` reads current search params from a prop passed by the server page, builds a new
`URLSearchParams` object on each change, and calls `router.push()`. The server component
re-renders with the new params on navigation.

**Why:** filter controls need `onChange` / `onInput` event handlers — these require a client
component. Encoding state in the URL keeps the server component as the data-fetching layer.

**Alternative considered:** a full client component tree that fetches data itself. Rejected
because it loses server-side rendering of the initial list and complicates the architecture.

### D3: Multi-select values encoded as repeated URL params (`?region=global&region=north-america`)
Each selected value in a multi-select becomes a separate param with the same key. Next.js 16
`searchParams` returns these as `string | string[] | undefined`; `etf-repository.ts` normalises
to `string[]` before passing to `filterEtfs()`.

**Why over comma-separated:** repeated params are easier to add/remove individually without
string-splitting and are idiomatic for array-valued query strings.

### D4: Changing any filter resets `page` to 1
`EtfFilters` deletes the `page` param whenever it writes new filter params. This prevents
showing page 5 of a result set that only has 1 page.

## Risks / Trade-offs

- [Filter component re-renders full page on every keystroke] → Mitigation: the text search
  input uses a local `useState` buffer and pushes the URL only on blur or Enter. Multi-select
  and TER input push on change (they are discrete, not continuous).
- [Stale `searchParams` prop if the user edits the URL directly] → Next.js server component
  re-renders on every navigation, so the prop is always fresh; no mitigation needed.

## Migration Plan

No existing data or URL structure changes. The new `search`, `assetClass`, `region`, `issuer`,
`distribution`, and `maxTer` params are additive — existing bookmarked URLs without those params
continue to work (they show the full catalogue).

Rollback: revert to the stub `filter.ts` and remove the `EtfFilters` import from `page.tsx`.
