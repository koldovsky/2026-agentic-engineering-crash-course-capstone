# Review: 09-etf-details

Scope: `git diff oleksandr-sorokin...HEAD`
Date: 2026-09-27

---

## Spec Compliance Audit

Spec files audited:
- `openspec/changes/04-etf-details/specs/etf-details/spec.md`
- `openspec/changes/04-etf-details/specs/etf-list/spec.md`
- `openspec/changes/04-etf-details/tasks.md`

---

### FINDING 1 — CRITICAL: `not-found.tsx` artifact is absent

**Scenario refs:** "Unknown ticker shows 404 page" · "404 page still shows the disclaimer banner"

**Spec requires:** "The system SHALL render a styled not-found page when `getByTicker()` returns null. The page SHALL display the text 'ETF not found' and include a 'Back to list' link to `/etfs`." (etf-details/spec.md, line 75)

**Code reality:** `app/etfs/[ticker]/page.tsx:22` calls `notFound()` correctly, but the file `app/etfs/[ticker]/not-found.tsx` does not exist. `find` over the entire `app/` tree returns no `not-found.*` files at all. Without this file, Next.js falls back to its generic error boundary, rendering neither the required "ETF not found" copy nor the "Back to list" link.

**Task evidence:** Task 5.2 states "Create `app/etfs/[ticker]/not-found.tsx`" and its checkbox is `[ ]` (unticked), correctly reflecting the artifact's absence.

**Suggestion:** Create `app/etfs/[ticker]/not-found.tsx` exporting a default component that renders "ETF not found" and a `<Link href="/etfs">Back to list</Link>`. The disclaimer banner requirement is satisfied via the root layout if this component is inside the layout boundary; verify that assumption.
Accept
---

### FINDING 2 — CRITICAL: No test for the rendered 404 page content

**Scenario refs:** "Unknown ticker shows 404 page" · "404 page still shows the disclaimer banner"

**Spec requires:** The 404 page shows "ETF not found" and a "Back to list" link; the disclaimer banner is visible.

**Code reality:** The only 404-related test is in `lib/09-etf-details.test.tsx:351–368`. It asserts only that `notFound()` (a mocked no-op) was called — it never renders a `not-found.tsx` component, never checks for the text "ETF not found", and never verifies the "Back to list" link or the disclaimer banner. Because the artifact itself is absent, these scenarios have zero unit-test coverage.

**Suggestion:** Once `not-found.tsx` is created, add tests that render it directly and assert: (a) the text "ETF not found" is present; (b) a link to `/etfs` labelled "Back to list" is present. For the disclaimer banner scenario, the banner lives in root layout and is tested elsewhere (lib/02-etf-list.test.tsx), so a note in the spec that this is satisfied transitively may suffice — but the scenario currently has no traceability.
Accept
---

### FINDING 3 — MAJOR: "Known ticker renders all page sections" is only partially tested

**Scenario ref:** "Known ticker renders all page sections" (etf-details/spec.md, line 16)

**Spec requires:** The page shows "the ETF name and ticker, KPI cards, a price chart, a holdings table, and allocation charts".

**Code reality:** `lib/09-etf-details.test.tsx:339–348` checks only that `container.textContent` matches `/IWDA/`. It does not assert the presence of KPI `<dl>`, the `<section aria-label="Price history">`, the `<section aria-label="Top holdings">`, or the two allocation sections.

**Suggestion:** Add assertions in that test that query the rendered output for `aria-label="Key metrics"`, `aria-label="Price history"`, `aria-label="Top holdings"`, `aria-label="Sector allocation"`, and `aria-label="Country allocation"` — all of which are already present in the implementation and would make the test scenario-complete.
Accept
---

### FINDING 4 — MAJOR: Positive/negative return CSS class is never tested

**Scenario ref:** "Positive return has a green tint, negative return has a red tint" (etf-details/spec.md, line 24)

**Spec requires:** "a positive value carries a green visual indicator and a negative value carries a red indicator, and the sign is always included so color is not the only signal."

**Code reality:** `app/etfs/[ticker]/page.tsx:54` applies `className={etf.return1y >= 0 ? "positive" : "negative"}` (same for 3Y and 5Y at lines 60, 66). The `formatReturn` tests at `lib/09-etf-details.test.tsx:88–98` only verify the leading sign character. No test renders the page with a known positive or negative return and asserts the CSS class on the `<dd>` element.

**Suggestion:** In the details-page integration test block, render the page for an ETF whose `return1y` is negative, query the "1Y Return" `<dd>`, and assert `classList.contains("negative")`. Do the same for a positive value.
Accept
---

### FINDING 5 — MAJOR: "KPI cards display correct values" lacks AUM formatting coverage in page context

**Scenario ref:** "KPI cards display correct values with proper formatting" (etf-details/spec.md, line 22)

**Spec requires:** "TER is shown as a percentage (e.g. '0.20%'), AUM is shown in abbreviated form (e.g. '$12.5B'), returns are shown as signed percentages, and inception date is shown as a human-readable date."

**Code reality:** `formatDate` and `formatReturn` are tested as units in `lib/09-etf-details.test.tsx:68–98`. `formatPercent` has its own test in `lib/format-percent.test.ts`. However, there is no test for `formatAum` in the project's test suite — searching the test files confirms `lib/format-aum.ts` has no companion test file. The rendered KPI card output (e.g. "$12.5B" in the AUM `<dd>`) is never asserted. Task 7.1 requires "add unit tests for both" (formatAum and formatDate) — the formatDate test exists; the formatAum test is absent.

**Files:** `lib/format-aum.ts` exists (imported at `page.tsx:5`) but no `lib/format-aum.test.ts` was found.

**Suggestion:** Add `lib/format-aum.test.ts` with cases for billion-range (e.g. 12500000000 → "$12.5B"), million-range (e.g. 250000000 → "$250M"), and edge cases. This also satisfies Task 7.1.
Accept
---

### FINDING 6 — MINOR: Tasks.md checkboxes are all unticked despite implementation existing

**Evidence:** Every checkbox in `openspec/changes/04-etf-details/tasks.md` is `[ ]`. All implementation files (page.tsx, PriceChart.tsx, HoldingsTable.tsx, AllocationChart.tsx, EtfTable.tsx update, format-date.ts, format-return.ts, and the test file) exist and are functional. The tasks file does not reflect reality — except Task 5.2 (not-found.tsx) and Task 7.1 (formatAum test) where the `[ ]` is accurate.

**Suggestion:** Tick completed tasks (1.x through 6.1, 7.1 formatDate portion, 8.1) and leave 5.2 and the formatAum portion of 7.1 unchecked. This is bookkeeping but required by the workflow: "every step must leave evidence."
Accept
---

### FINDING 7 — MINOR: Test files placed in `lib/` instead of co-located with artifacts

**Scenario ref:** Tasks 1.1–1.5 (tasks.md, lines 5–9)

**Spec/task requires:** Separate test files at `app/etfs/[ticker]/page.test.tsx`, `components/HoldingsTable.test.tsx`, `components/PriceChart.test.tsx`, `components/AllocationChart.test.tsx`, `components/EtfTable.test.tsx`.

**Code reality:** All scenarios are consolidated in `lib/09-etf-details.test.tsx`. The AGENTS.md convention says "new behaviour has a test next to the code". Coverage itself is present and tests pass (79 passing, 0 failures), but the co-location convention and task-specified filenames are not followed.

**Suggestion:** Either move test groups to their co-located files as the tasks specified, or amend tasks.md and AGENTS.md to record that consolidated test files in `lib/` are acceptable for this change.
Reject: moving files is pure churn with no behavior change and touches many files for zero functional benefit.
---

### FINDING 8 — MINOR: Issuer rendered as plain paragraph, not a "badge"

**Spec requires:** "a header with name, ticker, **issuer badge**, asset class, region, and distribution policy" (etf-details/spec.md, line 12).

**Code reality:** `app/etfs/[ticker]/page.tsx:38` renders `<p>{etf.issuer}</p>`. No badge/pill/tag styling is applied. The design.md may define what "badge" means visually.

**Suggestion:** Check `openspec/changes/04-etf-details/design.md` for the expected badge treatment and apply appropriate styling (e.g. a `<span>` with a badge class), or amend the spec to "issuer label" if a badge was not intentionally designed.
Accept
---

### Coverage Summary

**17 scenarios total: 10 implemented, 4 partial, 2 missing, 1 contradicted (by absent artifact)**

| Scenario | Status | Severity |
|---|---|---|
| Known ticker renders all page sections | partial | MAJOR |
| KPI cards display correct values | partial (AUM untested) | MAJOR |
| Positive/negative return tinting | partial (no class test) | MAJOR |
| Default range is 1Y | implemented | — |
| 1M tab filters to ~21 points | implemented | — |
| 6M tab filters to ~126 points | implemented | — |
| Chart is accessible | implemented | — |
| Holdings table renders in rank order | implemented | — |
| Table has accessible column headers | implemented | — |
| Sector chart renders proportional bars | implemented | — |
| Country chart renders proportional bars | implemented | — |
| Unknown ticker shows 404 page | missing (no not-found.tsx) | CRITICAL |
| 404 page still shows disclaimer banner | missing (no not-found.tsx + no test) | CRITICAL |
| Back link uses ref parameter | implemented | — |
| Back link falls back to /etfs | implemented | — |
| Row href includes ref with active filters | implemented | — |
| Row href includes ref with no filters | implemented | — |

---

## Code Review

---

### FINDING CR-1 — CRITICAL: Unvalidated `ref` URL allows open-redirect / `javascript:` XSS via the back-link

**File:** `app/etfs/[ticker]/page.tsx:24–29`

**Evidence:** `const backHref = ref ? decodeURIComponent(ref) : "/etfs";` is passed straight to `<Link href={backHref}>`. If a user visits `/etfs/IWDA?ref=javascript%3Aalert(document.cookie)` the decoded value becomes the anchor's `href` without any origin or scheme check. React/Next.js `Link` does not sanitise `javascript:` URLs, so the rendered `<a>` is a stored-XSS-equivalent vector whenever a link can be shared.

**Suggestion:** Validate `backHref` after decoding: accept only values that start with `/` (i.e. same-origin relative paths) and reject everything else, falling back to `/etfs`. A one-liner such as `const safe = decoded.startsWith("/") ? decoded : "/etfs"` is sufficient for a demo app.
Accept
---

### FINDING CR-2 — MAJOR: Every table cell is wrapped in a `<Link>`, causing accessibility issues for keyboard users

**File:** `components/EtfTable.tsx:93–105`

**Evidence:** Every `<td>` wraps its content in `<Link href="/etfs/${etf.ticker}?ref=...">`. The sort `<button>` is inside a `<th>`, while row navigation links are inside `<td>`. A click anywhere in the row (on a non-interactive cell) navigates away, with no affordance. More critically, keyboard users tabbing through a 20-row × 8-column table must traverse 160 links; WCAG 2.4.1 requires a mechanism to skip repeated navigation. In addition, the COLUMNS loop puts a `<Link>` in every cell including the Ticker cell — but the user has no visual indication which cell is the row link vs. plain data.

**Suggestion:** Move the row link to a single cell (e.g. the name or ticker column) or use a `<tr>` click handler pattern with a visually-hidden link, so there is one focusable element per row for keyboard navigation.
Accept
---

### FINDING CR-3 — MINOR: Chart range state stored in component state instead of URL, violating the shareable-link convention

**File:** `components/PriceChart.tsx:25`

**Evidence:** `const [range, setRange] = useState<Range>("1Y")` keeps the selected time range (`1M`, `6M`, `1Y`) in ephemeral React state. AGENTS.md explicitly states "Filter, sort and page state lives in the URL (searchParams), so every view has a shareable link." A user cannot share or bookmark a 1M or 6M chart view; refreshing always resets to 1Y.

**Suggestion:** Lift the range into a `range` search parameter via `useRouter` / `useSearchParams` (read the param on mount, write it on tab click), keeping the component `'use client'` but delegating persistence to the URL.
Accept
---

### FINDING CR-4 — MINOR: `notFound()` called without `return`, relying on implicit throw for control-flow

**File:** `app/etfs/[ticker]/page.tsx:22`

**Confidence:** low

**Evidence:** `if (!etf) notFound();` — Next.js `notFound()` is typed as returning `never`, so TypeScript does narrow `etf` to `Etf` on subsequent lines. However, if the `next` types do not mark `notFound` as `never` in this version, TypeScript would infer `etf` as `Etf | undefined` for the rest of the function, causing unsafe property accesses like `etf.name` without a compile error. The conventional form is `if (!etf) return notFound();` which is explicit about control-flow and safe under any version of the type signature.

**Suggestion:** Change to `if (!etf) return notFound();` to be explicit regardless of how `notFound`'s return type is declared.
Accept
---

### FINDING CR-5 — MINOR: `AllocationChart` `Tooltip` formatter parameter typed as `ValueType` but used directly in a template literal

**File:** `components/AllocationChart.tsx:25`

**Evidence:** `formatter={(v) => \`${v}%\`}` — recharts' `Tooltip formatter` callback receives a value typed as `ValueType = number | string | Array<number | string>`. If recharts ever passes an array (e.g. for stacked bars), the output becomes `"20,30%"`. The bar data here is a single series so it will not occur in practice, but TypeScript would flag this if strict mode were active.

**Suggestion:** Narrow the value: `formatter={(v) => \`${Number(v).toFixed(2)}%\`}` or `typeof v === "number" ? \`${v}%\` : String(v)`.
Accept
