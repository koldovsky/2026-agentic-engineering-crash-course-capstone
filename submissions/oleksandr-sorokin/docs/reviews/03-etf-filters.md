# Review: change 03-etf-filters

**Scope:** `git diff oleksandr-sorokin...HEAD`
**Date:** 2026-09-27
**Reviewers:** spec-compliance-auditor, code-reviewer

---

## Spec Compliance Audit

### Checklist derived from specs

**etf-filters/spec.md** (16 scenarios):
1. Ticker prefix match
2. Name substring match
3. Search term persists in URL
4. Single asset class selected
5. Multiple asset classes selected
6. Asset class filter clears when deselected
7. Region filter restricts results
8. Issuer filter restricts results
9. Distribution filter restricts results
10. TER threshold excludes more expensive funds
11. TER threshold includes ETFs exactly at the boundary
12. Two filters applied together
13. Reset clears all active filters
14. Reset preserves sort state
15. Shared URL restores filter state
16. Filter change resets to page 1

**etf-list/spec.md** (2 scenarios):
17. Filter params forwarded to list query
18. No filter params shows full catalogue

**18 scenarios: 11 implemented, 1 partial, 5 missing, 1 contradicted**

---

### CRITICAL findings

**Finding 1 — scenario 17 contradicts spec**
- Title: Page does not forward filter params to `list()`
- File: `app/etfs/page.tsx:20`
- Severity: critical
- Evidence: The spec (etf-list/spec.md) requires "The system SHALL read filter and search URL params (`search`, `assetClass`, `region`, `issuer`, `distribution`, `maxTer`) from `searchParams` and pass them to the `list()` call." The page reads params but the call is `list({ page, sortBy, sortDir, pageSize: DEFAULT_PAGE_SIZE })` — zero filter params are forwarded. The local variable `hasFilters` is computed but never used to alter the query.
- Suggestion: Parse all six filter params from `searchParams` and pass them into `list()`.
- ACCEPT 

**Finding 2 — scenarios 13 and 14 missing (Reset filters button)**
- Title: No "Reset filters" UI component exists
- File: spec path `openspec/changes/03-etf-filters/specs/etf-filters/spec.md` (lines 93–104)
- Severity: critical
- Evidence: Both "Reset clears all active filters" and "Reset preserves sort state" require a "Reset filters" button that removes filter URL params while keeping sort params. The directory `components/EtfFilters.tsx` does not exist. Tests are `it.todo` in `lib/03-etf-filters.test.ts:206-209`.
- Suggestion: Implement `components/EtfFilters.tsx` with the reset button; add non-todo tests.
- ACCEPT

**Finding 3 — scenario 3 missing (Search term persists in URL)**
- Title: No client component to write search term to URL
- File: spec path `openspec/changes/03-etf-filters/specs/etf-filters/spec.md` (line 25)
- Severity: critical
- Evidence: The spec says the search term SHALL be stored in the URL `search` param. No component exists that calls `useRouter`/`useSearchParams` to push the search term into the URL. Test in `03-etf-filters.test.ts:97` is `it.todo`.
- Suggestion: Implement the search input in `EtfFilters.tsx` that updates `?search=` on blur/Enter.
- ACCEPT

**Finding 4 — scenario 15 missing (Shared URL restores filter state)**
- Title: Filter state is not read from URL and applied on load
- File: `app/etfs/page.tsx` (entire file)
- Severity: critical
- Evidence: Spec requires "a copied URL opens the same filtered view." Because `page.tsx` does not forward filter params to `list()` (Finding 1) and `list()` itself throws `_notImplemented()` (`etf-repository.ts:26-30`), any URL with filter params renders an error. Test in `03-etf-filters.test.ts:212` is `it.todo`.
- Suggestion: Fix Finding 1 and implement the repository (task 2.2).
- ACCEPT

**Finding 5 — scenario 16 missing (Filter change resets pagination)**
- Title: No mechanism to reset `page` param when a filter changes
- File: spec path `openspec/changes/03-etf-filters/specs/etf-filters/spec.md` (lines 115–120)
- Severity: critical
- Evidence: The `EtfFilters` component does not exist, so no URL param manipulation occurs. Even the page-level code in `page.tsx` does not touch the `page` param relative to filter changes. Test in `03-etf-filters.test.ts:215` is `it.todo`.
- Suggestion: In `EtfFilters.tsx`, delete the `page` param whenever any filter param changes.
- ACCEPT

**Finding 6 — tasks 2.1 / 2.2 not done: `list()` still throws**
- Title: `etf-repository.ts::list()` is an unimplemented stub
- File: `lib/etf-repository.ts:26-34`
- Severity: critical
- Evidence: `list()` calls `_notImplemented()` which throws unconditionally. The proposal states "`lib/etf-repository.ts` — `list()` must call `filterEtfs()` before `sortEtfs()` / pagination." All tests in `etf-repository.test.ts` still use `it.fails` (lines 6, 15, 26, 34, 45, 54, 69, 83), meaning the repository layer is entirely untested in the passing sense and non-functional.
- Suggestion: Implement `list()` to call `filterEtfs()`, then sort, then paginate; convert `it.fails` to `it`.
- ACCEPT

---

### MAJOR findings

**Finding 7 — tasks 1.1 / 1.2 are done but `tasks.md` checkboxes are not ticked**
- Title: `tasks.md` shows all tasks unchecked despite tasks 1.1 and 1.2 being complete
- File: `openspec/changes/03-etf-filters/tasks.md:5-6`
- Severity: major
- Evidence: `filterEtfs` in `lib/filter.ts` is fully implemented and all tests in `lib/filter.test.ts` and `lib/03-etf-filters.test.ts` pass (no `it.fails`). Yet `tasks.md` shows `- [ ] 1.1` and `- [ ] 1.2`. This is a false picture of completeness — the tasks.md is the spec-side artifact that should be updated.
- Suggestion: Tick `[x]` for tasks 1.1 and 1.2 in `tasks.md`.
- ACCEPT

**Finding 8 — scenario 18 partially implemented**
- Title: "No filter params shows full catalogue" works at logic layer but not at page layer
- File: `app/etfs/page.tsx:20` and `lib/etf-repository.ts:32`
- Severity: major
- Evidence: `filterEtfs(ETFS, {})` returns all ETFs (tested and passing in `03-etf-filters.test.ts:91-93`). But `list({})` throws an error because `etf-repository.ts` is a stub, so the page renders nothing. The scenario is only satisfied at the pure-function level.
- Suggestion: Implement `list()` in `etf-repository.ts`.
- ACCEPT

**Finding 9 — stale comment in acceptance test file**
- Title: `03-etf-filters.test.ts` header comment says "No implementation yet — all tests below must be red"
- File: `lib/03-etf-filters.test.ts:1-5`
- Severity: major
- Evidence: The comment at the top of the file says "No implementation yet — all tests below must be red until lib/filter.ts is implemented." The implementation is now present in `lib/filter.ts` and those tests are green. The stale comment misrepresents the current state.
- Suggestion: Update the file header to reflect the current status.
- ACCEPT

---

### MINOR findings

**Finding 10 — `hasFilters` in page.tsx omits `distribution` and `maxTer`**
- Title: `hasFilters` check incomplete — two filter dimensions ignored
- File: `app/etfs/page.tsx:16-18`
- Severity: minor
- Evidence: `hasFilters` only checks `params.search || params.assetClass || params.region || params.issuer`. It omits `params.distribution` and `params.maxTer`, which are valid filter params per both the spec and the `ListQuery` type. This is scope drift not backed by any requirement.
- Suggestion: Either remove `hasFilters` (it is currently unused in the rendered JSX) or add the missing params.
- Accept: remove `hasFilters`

**Finding 11 — `filter.test.ts` name-substring assertion is case-sensitive**
- Title: Case-insensitivity test in `filter.test.ts` uses a case-sensitive assertion in the `forEach`
- File: `lib/filter.test.ts:33`
- Severity: minor
- Evidence: The scenario says "The comparison SHALL be case-insensitive." The `forEach` check is `e.ticker.includes("Vanguard") || e.name.includes("Vanguard")` (capital V), while the search is also `"Vanguard"` (capital V). The test passes today only because the data matches the capitalisation. The `03-etf-filters.test.ts:80` version correctly tests with `"vanguard"` lowercase. The `filter.test.ts` version does not verify the case-insensitivity behavior end-to-end.
- Suggestion: Change the search in `filter.test.ts:30` to `"vanguard"` (lowercase) and update the `forEach` assertion to uppercase both sides.
- Accept: minor

---

### Scope drift (no backing requirement)

- `app/etfs/page.tsx` computes `hasFilters` (lines 16-18) and passes it as a prop to `<EtfTable hasFilters={hasFilters} />` (line 25). There is no requirement in either spec for a `hasFilters` prop on the table. This is silent drift — it may be preparation for a "no results" state but it is undocumented.

---

### `tasks.md` checkbox reality check

| Task | Status in `tasks.md` | Actual state |
|---|---|---|
| 1.1 Write failing filter tests | `[ ]` unchecked | DONE — `filter.test.ts` and `03-etf-filters.test.ts` are green |
| 1.2 Implement `filterEtfs()` | `[ ]` unchecked | DONE — `lib/filter.ts` fully implemented |
| 2.1 Write failing `list()` filter test | `[ ]` unchecked | NOT DONE — tests in `etf-repository.test.ts` still use `it.fails` |
| 2.2 Implement `list()` with filter wiring | `[ ]` unchecked | NOT DONE — `list()` throws unconditionally |
| 3.1 Write failing `EtfFilters` component test | `[ ]` unchecked | NOT DONE — no test file exists |
| 3.2 Create `components/EtfFilters.tsx` | `[ ]` unchecked | NOT DONE — file does not exist |
| 4.1 Write failing page integration test | `[ ]` unchecked | NOT DONE — no integration test |
| 4.2 Forward filter params in `page.tsx` | `[ ]` unchecked | NOT DONE — filter params not passed to `list()` |
| 5.1 `pnpm check` green | `[ ]` unchecked | NOT DONE — `list()` throws, so `pnpm check` cannot be green |
| 5.2 Manual verification | `[ ]` unchecked | NOT DONE |

Two tasks (1.1, 1.2) are complete but not ticked. Eight tasks remain genuinely incomplete.

---

## Code Review

### Finding 1 — Test assertion in "search by name substring" does not verify case-insensitive behavior

- **File:** `lib/filter.test.ts`
- **Line:** 33
- **Severity:** minor
- **Evidence:** The test calls `filterEtfs(ETFS, { search: "Vanguard" })` (capitalized) and then asserts `e.ticker.includes("Vanguard") || e.name.includes("Vanguard")` — both are case-sensitive `includes`. Because the ETF name literally contains the string "Vanguard" with that exact casing, the assertion passes even if the implementation removed `.toUpperCase()` and became case-sensitive. The comment on line 23 ("CR-7: both sides normalised to uppercase") only appears on the ticker-prefix test; this test carries no equivalent signal.
- **Suggestion:** Change the search term to all-lowercase (`"vanguard"`) and update the assertion to compare against the uppercased fields, mirroring what the acceptance test in `03-etf-filters.test.ts` line 81 already does correctly.
- Accept
---

### Finding 2 — `maxTer: NaN` silently disables the filter, showing all ETFs instead of an empty set

- **File:** `lib/filter.ts`
- **Line:** 31
- **Severity:** minor
- **Confidence:** low
- **Evidence:** The guard is `if (maxTer !== undefined)`. `NaN !== undefined` is `true`, so a `NaN` value (which TypeScript's `number` type admits, and which URL parsing of a non-numeric `?maxTer=abc` would produce) enters the body. `etf.ter > NaN` always evaluates to `false`, meaning every ETF passes the TER gate. The user sees an unfiltered list when they may expect a filtered or error state.
- **Suggestion:** Add a `Number.isFinite(maxTer)` guard (replacing or augmenting `maxTer !== undefined`) so a non-finite value is treated the same as an absent filter, and document this contract. Input validation at the URL-parsing layer is a complementary, not alternative, fix.
- Accept
---

### Finding 3 — Stale file-level comment in acceptance test file declares implementation does not exist

- **File:** `lib/03-etf-filters.test.ts`
- **Line:** 4
- **Severity:** minor
- **Evidence:** Line 4 reads "No implementation yet — all tests below must be red until lib/filter.ts is implemented." `lib/filter.ts` is now implemented and all tests in this file are green. The comment is actively misleading: a future reader inspecting a test failure would be told there is no implementation to look at.
- **Suggestion:** Remove or replace the comment with a brief description of what the file covers (e.g., "Acceptance tests for the 03-etf-filters spec").
-  Accept: Same as F9
---

### Finding 4 — Identical 5-ETF fixture array is duplicated across two test files

- **File:** `lib/filter.test.ts:6` and `lib/03-etf-filters.test.ts:11`
- **Severity:** minor
- **Evidence:** Both files declare a `const ETFS: Etf[]` containing the exact same five objects (IWDA, CSPX, VWCE, AGGH, XMWO with identical field values). `lib/test-fixtures.ts` already exports `BASE_ETF` for this purpose; the per-file constant is an extension of that pattern that was not completed.
- **Suggestion:** Export the shared `ETFS` array from `lib/test-fixtures.ts` (or a dedicated `lib/filter.fixtures.ts`) and import it in both test files. A single authoritative fixture makes adding edge-case ETFs (e.g., a TER boundary case) a one-line change.
- Reject: test-maintenance debt
