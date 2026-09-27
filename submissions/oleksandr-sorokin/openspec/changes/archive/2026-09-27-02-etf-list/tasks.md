# Tasks

## 1. AUM formatter utility

- [x] 1.1 Write failing tests for `formatAum` in `lib/format-aum.test.ts` — cover values in millions (e.g. `980` → `$980M`) and billions (e.g. `12400` → `$12.4B`); verify `pnpm test` reports the new tests as failing
- [x] 1.2 Implement `lib/format-aum.ts` and verify `pnpm test` shows the `format-aum` suite passing

## 2. Root redirect

- [x] 2.1 Write a failing Vitest test (or Next.js redirect smoke test) asserting that `GET /` results in a redirect to `/etfs`; verify the test is red
- [x] 2.2 Replace `app/page.tsx` with a `redirect('/etfs')` Server Component and verify the redirect test turns green

## 3. Global layout — top bar and disclaimer banner

- [x] 3.1 Write failing rendering tests for `app/layout.tsx` (via a wrapper render) asserting the disclaimer text "Demo data — not investment advice" is present; verify the tests are red
- [x] 3.2 Update `app/layout.tsx` to add a persistent top bar (app name) and the full-width disclaimer banner; verify tests turn green and `pnpm typecheck` passes

## 4. ETF list page — table shell

- [x] 4.1 Write failing tests for `app/etfs/page.tsx` (using `@testing-library/react`) asserting: (a) the 8 required column headers are rendered, (b) rows contain links to `/etfs/[ticker]`, (c) "Showing 1–20 of N" count is visible when more than 20 ETFs exist; verify tests are red
- [x] 4.2 Create `app/etfs/page.tsx` as a Server Component that awaits `searchParams`, calls `repo.list()` with `page`/`sortBy`/`sortDir` from the URL, and renders `EtfTable` and the "Showing X–Y of N" count; create `components/EtfTable.tsx` (data-only rendering, no sort interaction yet); verify table tests turn green

## 5. Sort by column header

- [x] 5.1 Write failing tests for `EtfTable` asserting: (a) column headers are buttons with `aria-sort` attributes, (b) clicking a header updates the URL with `sortBy` and `sortDir=asc`, (c) clicking the same header again sets `sortDir=desc`; verify tests are red
- [x] 5.2 Add sort-click handling to `EtfTable.tsx` (using `useRouter`/`useSearchParams`) and verify the sort tests turn green

## 6. Pagination controls

- [x] 6.1 Write failing tests for `EtfPagination` asserting: (a) "Previous" is disabled on page 1, (b) clicking "Next" updates the URL with `page=2`, (c) the current page number is shown; verify tests are red
- [x] 6.2 Create `components/EtfPagination.tsx` and wire it into `app/etfs/page.tsx`; verify pagination tests turn green

## 7. Empty state

- [x] 7.1 Write failing tests for the empty-state branch of `EtfTable` or `app/etfs/page.tsx` asserting: (a) "No ETFs match your filters." is shown when `items` is empty and filters are active, (b) a "Clear filters" button is rendered, (c) clicking "Clear filters" removes all filter params from the URL; verify tests are red
- [x] 7.2 Implement the empty-state UI in `EtfTable.tsx` (or the page) and verify all empty-state tests turn green

## 8. Integration check

- [x] 8.1 Run `pnpm check` and verify exit code 0; quote the test count in the commit message
