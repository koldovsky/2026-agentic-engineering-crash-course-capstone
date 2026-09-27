# Review: 02-etf-list — `feat/07-etf-list`

Diff scope: `git diff oleksandr-sorokin...HEAD`
Date: 2026-09-27

---

## Spec Compliance Audit

*From the spec-compliance-auditor subagent.*

Spec file: `openspec/changes/02-etf-list/specs/etf-list/spec.md`

---

### Scenario 1 — Root redirect

**Spec:** "WHEN a user navigates to `/` THEN the browser is redirected to `/etfs` and the ETF list page is shown"

**Status: implemented**

`app/page.tsx:1-3` calls `redirect('/etfs')` at module evaluation time. Vitest test exists at `lib/02-etf-list.test.tsx:59-71` and passes (19/19 tests green per evidence doc `2026-09-27-4ed58ab-02-etf-list-iter3.md`).

---

### Scenario 2 — All required columns are present

**Spec:** "WHEN a user loads `/etfs` with data available THEN the table contains exactly the columns: ticker, name, issuer, asset class, region, TER %, AUM, 1Y return"

**Status: partially-implemented**

`components/EtfTable.tsx:16-25` defines all 8 required columns correctly. However, `app/etfs/page.tsx` does not exist anywhere in the repository (confirmed by `find` and `git diff --name-only` output). There is no Next.js route handler at `/etfs`, so loading that URL would 404 — the table never renders in a real browser. The Vitest test at `lib/02-etf-list.test.tsx:91-114` passes because it renders the component in isolation without a route.

**Severity: critical**
Accept: critical
---

### Scenario 3 — Row links to detail page

**Spec:** "WHEN a user clicks any row in the ETF table THEN the browser navigates to `/etfs/[ticker]` for that row's ETF"

**Status: partially-implemented**

`components/EtfTable.tsx:86-87` wraps only the ticker cell in `<a href="/etfs/${etf.ticker}">`. The other 7 cells in every row are plain text — clicking them does not navigate. The spec scenario says "clicks any row" implying the entire row is interactive. The test at `lib/02-etf-list.test.tsx:118-133` only asserts that a link with the expected `href` exists somewhere in the row, not that the row itself (or every cell) is a link — the test passes but does not validate the full scenario intent.

**Severity: major**
Accept
---

### Scenario 4 — Default page shows first 20 rows

**Spec:** "WHEN `/etfs` is loaded with no page parameter and more than 20 ETFs are available THEN at most 20 rows are displayed and the count reads 'Showing 1–20 of N'"

**Status: partially-implemented**

`components/EtfPagination.tsx:24` renders "Showing {start}–{end} of {total}" correctly from props. The component itself passes its test at `lib/02-etf-list.test.tsx:233-237`. However, the actual 20-row slicing of the ETF dataset (reading `?page` from `searchParams`, calling `repo.list()` with `pageSize: 20`) was supposed to be done in `app/etfs/page.tsx`, which does not exist. The component cannot enforce the "at most 20 rows" constraint on its own; that logic lives in the missing page.

**Severity: critical**
Accept
---

### Scenario 5 — Page 2 shows the next batch

**Spec:** "WHEN the user navigates to page 2 (e.g. `?page=2`) THEN rows 21–40 are displayed and the count reads 'Showing 21–40 of N'"

**Status: partially-implemented**

Same root cause as Scenario 4. `EtfPagination.tsx:14-16` calculates `start` and `end` from props and renders them correctly. Test at `lib/02-etf-list.test.tsx:238-241` passes. But without `app/etfs/page.tsx`, no code reads `searchParams.get('page')` and passes it to the repository, so the second page of data is never actually fetched or sliced.

**Severity: critical**
Accept
---

### Scenario 6 — Clicking a column header sorts ascending

**Spec:** "WHEN a user clicks a column header for the first time THEN the table rows are re-ordered ascending by that column and the URL reflects the active sort"

**Status: partially-implemented**

`components/EtfTable.tsx:37-41`: clicking an inactive header calls `router.push('/etfs?sortBy=${key}&sortDir=asc')`. The URL is updated. Test at `lib/02-etf-list.test.tsx:151-165` passes. Partial concern: `handleSort` constructs the URL as `/etfs?sortBy=X&sortDir=Y`, dropping any current `?page=N` parameter. If the user is on page 3 and clicks a column header, the page resets to 1 silently. The spec does not explicitly require page preservation on sort, so this is not a spec violation, but it is a behavioral gap worth noting.

The deeper problem is that sorting in the URL has no effect without `app/etfs/page.tsx` to read `sortBy`/`sortDir` from `searchParams` and pass them to `repo.list()`.

**Severity: major**
Accept
---

### Scenario 7 — Clicking the active column header toggles to descending

**Spec:** "WHEN a user clicks the currently-sorted column header THEN the sort direction toggles to descending and the URL is updated accordingly"

**Status: implemented** (component only; same page-missing caveat as above)

`components/EtfTable.tsx:38-40`: `key === sortBy && sortDir === 'asc'` correctly produces `desc` on second click. Test at `lib/02-etf-list.test.tsx:169-185` passes.

---

### Scenario 8 — Sort state survives page reload

**Spec:** "WHEN the user copies the URL with a sort parameter and opens it in a new tab THEN the same sort order is applied"

**Status: partially-implemented**

`EtfTable` reads `sortBy` and `sortDir` as props (set from `searchParams` in the server component) and applies `aria-sort` accordingly — the state is in the URL and would survive a reload IF `app/etfs/page.tsx` existed to read those params. Test at `lib/02-etf-list.test.tsx:188-202` confirms the component renders correctly from props.

However, `components/EtfPagination.tsx:18` constructs page navigation as `router.push('/etfs?page=${p}')` — this drops `sortBy` and `sortDir` from the URL entirely. A user sorted by AUM clicking "Next" would land on `?page=2` with no sort. This is a contradicts-spec behavior for the URL-as-state principle and breaks the "sort state survives page reload" guarantee after any pagination action.

**Severity: major** (contradicts the URL-as-state design principle stated in the spec: "Sort state SHALL be stored in the URL `searchParams`"; pagination silently discards it)
Accept: bugfix
---

### Scenario 9 — Empty filtered result

**Spec:** "WHEN active filters produce zero results THEN the table is replaced by 'No ETFs match your filters.' and a 'Clear filters' button is visible"

**Status: implemented**

`components/EtfTable.tsx:47-58`: when `items.length === 0` and `hasFilters` is true, renders the correct message and button. Also correctly renders "No ETF data available." when `hasFilters` is false (the spec's secondary condition). Tests at `lib/02-etf-list.test.tsx:205-215` pass.
Reject: Described in design.md
---

### Scenario 10 — Clear filters button resets the view

**Spec:** "WHEN a user clicks 'Clear filters' THEN all filter and search URL parameters are removed and the full list is shown"

**Status: implemented**

`components/EtfTable.tsx:43-45`: `router.replace('/etfs')` with no params. Test at `lib/02-etf-list.test.tsx:218-224` passes.
Reject: Layout covers it globally
---

### Scenario 11 — Banner present on the list page

**Spec:** "WHEN a user loads `/etfs` THEN the disclaimer banner 'Demo data — not investment advice' is visible on the page"

**Status: implemented**

`app/layout.tsx:31-36` renders a `<div role="banner">` with the exact text. Test at `lib/02-etf-list.test.tsx:272-284` passes (with a harmless `<html>` nesting hydration warning in jsdom).

---

### Scenario 12 — Banner present on page 2

**Spec:** "WHEN a user navigates to `/etfs?page=2` THEN the disclaimer banner is still visible"

**Status: implemented**

The banner is in `app/layout.tsx`, which wraps all pages — it is not page-specific. The same test (line 272-284) covers this scenario transitively since the layout applies globally. There is no dedicated test for this second scenario; it relies solely on the single layout rendering test. This is acceptable given the implementation strategy but worth noting.

---

### Tasks.md Checkbox Audit

All 16 checkboxes in `openspec/changes/02-etf-list/tasks.md` are unchecked (`[ ]`), even though:

- Task 1.1 and 1.2 (`format-aum`) — done (lib/format-aum.ts exists, 3 tests pass)
- Task 2.1 and 2.2 (root redirect) — done (app/page.tsx updated, test passes)
- Task 3.1 and 3.2 (layout banner) — done (app/layout.tsx updated, test passes)
- Task 4.1 (failing tests for etfs page) — done (lib/02-etf-list.test.tsx written)
- Task 5.1 and 5.2 (sort) — component done (EtfTable.tsx), but page not wired
- Task 6.1 and 6.2 (pagination) — component done (EtfPagination.tsx), but page not wired
- Task 7.1 and 7.2 (empty state) — done
- Task 8.1 (pnpm check green) — not verifiable without the missing page

Tasks 4.2, 5.2 partially, 6.2 partially, and 8.1 are legitimately incomplete (missing `app/etfs/page.tsx`). But the completed tasks are also not ticked, making the checkbox state entirely inaccurate.

**Severity: minor** for unchecked completed tasks; **major** for tasks 4.2 and 8.1 being ticked uncompleted when they represent the critical missing deliverable.
Accept
---

### Silent Scope Drift

1. **"Page X of Y" display** — `components/EtfPagination.tsx:28` renders `Page {page} of {totalPages}`. The spec only requires "Showing X–Y of N" — no per-page/total-pages counter. This is extra UI not required by the spec. **Severity: minor** (harmless addition; spec could be amended or the line removed).

2. **Top nav bar** — `app/layout.tsx:27-30` adds a persistent `<nav>` with "ETF Dashboard". This is present in the proposal and design.md but not in any spec requirement. Since the proposal describes it, this is documented intent, not true drift. No action needed.

---

### Coverage Summary

**12 scenarios: 7 implemented, 5 partial, 0 missing, 0 contradicted**

The 5 partial scenarios share two root causes:

**Root cause A (critical):** `app/etfs/page.tsx` was never created. The proposal, design.md, and tasks.md all call for it. Without it, there is no `/etfs` route, no server-side data fetch, no URL-param-to-component wiring, and no 20-row pagination from the repository. Scenarios 2, 4, and 5 are shell-only (component renders in Vitest but the page itself does not exist).

**Root cause B (major):** `EtfPagination.tsx:18` constructs page URLs as `/etfs?page=N`, unconditionally dropping `sortBy` and `sortDir`. This means any pagination action destroys the current sort state, directly contradicting the spec requirement that sort state SHALL live in `searchParams` and that every view be a shareable link (Scenario 8, design.md §URL as source of truth).

---

## Code Review

*From the code-reviewer subagent.*

---

### Finding 1 — `redirect('/etfs')` called at module scope, not inside the component body

**File:** `app/page.tsx:3`
**Severity:** critical

`redirect()` from `next/navigation` works by throwing a special `NEXT_REDIRECT` error that Next.js catches during a render cycle. Calling it at module scope (line 3, outside any function) means it fires during module initialization, not during a request render. This is not supported by the framework — the redirect will throw during module load in the Node.js process, and the `export default function Home()` on line 5 becomes unreachable dead code. The test at `lib/02-etf-list.test.tsx:67` works around this with a dynamic import, but in a real build the behavior is undefined: on the first `import` the error is thrown; on subsequent imports the module is cached and the redirect is silently skipped.

**Suggestion:** Move `redirect('/etfs')` inside the component body: `export default function Home() { redirect('/etfs'); }`. The `redirect()` call and the `return null` below it form unreachable dead code as written; the function body approach is the standard Next.js pattern and makes the test's dynamic-import trick unnecessary.
Accept: `redirect('/etfs')` at module scope.
---

### Finding 2 — `handleSort` constructs a bare URL that drops all existing search params (filters, page)

**File:** `components/EtfTable.tsx:37-41`
**Severity:** major

`router.push(\`/etfs?sortBy=${key}&sortDir=${newDir}\`)` hard-codes only two params. AGENTS.md mandates that "filter, sort and page state lives in the URL." If a user has active filters (e.g., `?assetClass=equity&region=europe`) and clicks a column header, all filter params are silently wiped — the URL becomes `?sortBy=name&sortDir=asc` and the filtered result disappears. The same template-literal approach is used in `handleClearFilters` (`router.replace('/etfs')`) which is intentional, but the sort action is not.

**Suggestion:** Read the current search params via `useSearchParams()`, clone them, update only the sort keys, then push the merged params. For example: `const params = new URLSearchParams(searchParams); params.set('sortBy', key); params.set('sortDir', newDir); params.delete('page'); router.push(\`/etfs?${params}\`);`
Accept: Same as SC-6 
---

### Finding 3 — `goTo` in `EtfPagination` drops all URL params except `page`, destroying sort and filter state

**File:** `components/EtfPagination.tsx:18-20`
**Severity:** major

`router.push(\`/etfs?page=${p}\`)` emits a URL containing only the `page` parameter. Any active `sortBy`, `sortDir`, or filter params are dropped on every page navigation. Per AGENTS.md the URL is the only source of truth for all state, so navigating to page 2 of a filtered+sorted result must keep the sort and filter params intact. The current implementation breaks shareable links and resets the entire view on each page turn.

**Suggestion:** Accept `searchParams` (or use `useSearchParams()`) in `EtfPagination`, clone the params, set only `page`, and push the merged result: `const p = new URLSearchParams(searchParams); p.set('page', String(target)); router.push(\`/etfs?${p}\`);`
Accept: Same as SC8
---

### Finding 4 — `app/etfs/` route does not exist — the redirect destination 404s

**File:** `app/page.tsx:3`
**Severity:** major

`ls app/` shows only `favicon.ico globals.css layout.tsx page.tsx` — there is no `app/etfs/page.tsx` or `app/etfs/` directory. `EtfTable` and `EtfPagination` components exist but have no page that renders them. Every visit to `/` will redirect to `/etfs` and receive a 404 from Next.js. This is the core missing deliverable of the feature.

**Suggestion:** Create `app/etfs/page.tsx` as a Server Component that reads `searchParams`, applies sort/filter/pagination logic, and renders `EtfTable` + `EtfPagination`. This is a missing implementation, not a code quality issue.
Accept: Same as SC2
---

### Finding 5 — `EtfPagination` renders "Showing 1–0 of 0" when `total === 0`

**File:** `components/EtfPagination.tsx:14-15`
**Severity:** major

`const start = (page - 1) * pageSize + 1` evaluates to `1` when `total=0, page=1`. `const end = Math.min(page * pageSize, total)` evaluates to `0`. The rendered text becomes `"Showing 1–0 of 0"`, which is nonsensical. There is no test covering this case. Because `EtfTable` already handles the empty state (lines 47–57), `EtfPagination` would render alongside it when the parent page passes `total={0}`, unless the caller conditionally suppresses it — but there is no such contract in the prop types.

**Suggestion:** Guard against `total === 0` at the top of the component: either return `null` (let the caller decide) or compute `start = total === 0 ? 0 : (page - 1) * pageSize + 1` and add a test case.
Accept: Same as SC-4
---

### Finding 6 — `role="banner"` on the disclaimer `<div>` is semantically incorrect — collides with the page's landmark structure

**File:** `app/layout.tsx:31`
**Severity:** minor

`role="banner"` is an ARIA landmark equivalent to `<header>` and must appear at most once per page to represent the primary site header. The existing `<nav>` element (line 27) already contributes to the header landmark region. Adding `role="banner"` to a subsidiary disclaimer strip creates a second banner landmark, which confuses screen-reader landmark navigation. A disclaimer strip is informational content, not a site header.

**Suggestion:** Remove `role="banner"` from the disclaimer `<div>`. If the element needs a role for assistive technology, `role="note"` or `role="status"` are appropriate for informational content. Alternatively, no role is needed — the text is already readable as body content.
Accept: Accessibility violation
---

### Finding 7 — Raw `<a href>` used for ETF detail navigation instead of Next.js `<Link>`

**File:** `components/EtfTable.tsx:87`
**Severity:** minor

`<a href={`/etfs/${etf.ticker}`}>{etf.ticker}</a>` forces a full-page reload on every row click, bypassing Next.js client-side navigation. All 20+ rows in a rendered table create 20+ hard-navigation links. This is a framework convention violation; the `next/link` `<Link>` component handles prefetching and soft navigation.

**Suggestion:** Replace with `import Link from 'next/link'` and use `<Link href={`/etfs/${etf.ticker}`}>{etf.ticker}</Link>`.
Accept: easy fix
---

### Finding 8 — `formatAum` returns malformed output for non-positive or non-finite inputs

**File:** `lib/format-aum.ts:1-6`
**Severity:** minor (confidence: low)

`formatAum(-500)` returns `"$-500M"` and `formatAum(NaN)` returns `"$NaNM"` because neither condition guards against these inputs. `formatAum(Infinity)` enters the `>= 1000` branch and returns `"$InfinityB"` since `(Infinity / 1000).toFixed(1)` is `"Infinity"`. The `Etf` type declares `aum: number` without a positive-number constraint, and the Zod schema (`EtfSchema.parse`) is not yet implemented (it throws `_notImplemented()`), leaving no validated boundary. All three tests in the test file use only valid positive integers, so these paths are untested.

**Suggestion:** Add a guard at the top of the function: `if (!Number.isFinite(value) || value < 0) return 'N/A';`. Add a test case for `formatAum(0)` and `formatAum(NaN)`.
Reject: ETF data always positive, not a real risk
---

### Finding 9 — `afterEach(cleanup)` is placed between `import` declarations

**File:** `lib/02-etf-list.test.tsx:13-14`
**Severity:** minor

`afterEach(cleanup);` at line 13 appears between `import { render, … }` (line 11) and `import type { Etf }` (line 14). While ES `import` declarations are hoisted to the top of the module before any statements execute, placing a function call between import statements is unconventional and breaks the expected layout that most static analysis tools and readers assume. It makes the cleanup registration easy to miss during review.

**Suggestion:** Move `afterEach(cleanup)` to after all import declarations and before the first `vi.mock()` call, following standard Vitest test file structure.
Accept: cleaner
---

### Finding 10 — `app/layout.tsx` metadata still holds the `create-next-app` scaffold defaults

**File:** `app/layout.tsx:15-18`
**Severity:** minor

`title: "Create Next App"` and `description: "Generated by create next app"` are scaffold defaults that were not updated when the nav bar and disclaimer were added. Because `metadata` is used for `<title>` and `<meta name="description">`, these strings will appear in browser tabs, search engine results, and screen-reader document titles throughout the app.

**Suggestion:** Update `metadata` to reflect the actual product: `title: "ETF Dashboard"` and a matching description.
Accept: quick fix
