# Review: 01-etf-data — "write failing tests + type stubs" step

**Scope:** `git diff oleksandr-sorokin...HEAD -- lib/ scripts/`
**Date:** 2026-09-27
**Reviewers:** spec-compliance-auditor, code-reviewer (subagents)

---

## Part 1 — Spec-Compliance Audit

### Spec Scenario Inventory (11 scenarios across 5 requirements)

| # | Scenario | Spec Source |
|---|----------|-------------|
| S1 | Deterministic output | Seed generator |
| S2 | No network calls | Seed generator |
| S3 | Valid record shape | ETF schema |
| S4 | Prices cover ~1 trading year | ETF schema |
| S5 | Corrupt file throws on load | Repository |
| S6 | Unfiltered list returns first page | Repository list |
| S7 | Search filter narrows results | Repository list |
| S8 | maxTer filter excludes expensive ETFs | Repository list |
| S9 | Pagination advances correctly | Repository list |
| S10 | Known ticker returns the ETF | getByTicker |
| S11 | Unknown ticker returns null | getByTicker |

**Coverage summary:** 11 scenarios: 8 implemented (correct `it.fails()` wiring with proper WHEN/THEN capture), 3 partial (S2 — no-network-access WHEN not enforced; S3 — fixture instead of data/etfs.json; S5 — "descriptive" error not asserted), 0 missing, 0 contradicted.

---

### Compliance Findings

**SC-1 — S2: No-network-calls WHEN condition not enforced**
- File: `scripts/generate-seed.test.ts:33`
- Type: partially-implemented
- Severity: major
- The spec WHEN is "the generator runs **without network access**"; the test title is "produces valid JSON output without requiring network access". The test simply calls `runGenerator()` on an unrestricted process — it never blocks or intercepts network I/O. A script that secretly fetched live data would pass this test as long as the network was up. The THEN (valid JSON array, ~40 records) is tested; the WHEN condition is not enforced.
- Suggestion: Run the generator with `NODE_OPTIONS=--experimental-permission --allow-fs-read=... --allow-fs-write=...` to explicitly deny network access, or use a test-level HTTP mock/interceptor (e.g. `nock`) that fails if any request is made. Alternatively, add a prose comment marking this as a manual verification point and amend the spec scenario to say "the script contains no import or call to node:http/https/node-fetch/undici".
- Accept: real gap in spec
---

**SC-2 — S3: Test parses a hand-crafted fixture instead of data/etfs.json**
- File: `lib/etf-schema.test.ts:37`
- Type: partially-implemented
- Severity: major
- Spec WHEN is "data/etfs.json is parsed with EtfSchema". The test instead parses a hand-crafted `VALID_ETF` fixture. The actual data file is never loaded. Once `data/etfs.json` is generated (task 2.2) and the schema is implemented (task 1.2), there is no test that will verify every generated record against the schema — the gap is permanent unless a separate integration test is added.
- Suggestion: Add a second test (in `lib/etf-schema.test.ts` or a separate `data/etfs.test.ts`) that reads `data/etfs.json` and runs `z.array(EtfSchema).parse(...)` on its contents. Mark it `it.fails` until both the schema and the data file exist.
- Accept: real gap in spec
---

**SC-3 — S5: "Descriptive error" not asserted**
- File: `lib/etf-repository.test.ts:76`
- Type: partially-implemented
- Severity: minor
- Spec says "throws **a descriptive error**". The test asserts only `rejects.toThrow()` with no argument. Nothing verifies the error message mentions the offending field, the record index, or anything else that would make it "descriptive". A repository that threw `new Error("oops")` would pass.
- Suggestion: Change to `rejects.toThrow(/invalid|schema|validation/i)` or any regex that verifies the error message carries information about the failure cause.
- Accept: easy fix
---

**SC-4 — S3: `aum: 0` boundary not tested**
- File: `lib/etf-schema.test.ts:98`
- Type: partially-implemented
- Severity: minor
- The test at line 98 checks `aum: -1` is rejected. It does not check `aum: 0`. The spec says "positive number (million USD)", which is strictly > 0. Zero AUM would be semantically invalid (a fund with no assets) but this boundary is untested.
- Suggestion: Add `expect(() => EtfSchema.parse({ ...VALID_ETF, aum: 0 })).toThrow()` alongside the negative-value test.
- Accept: easy fix
---

**SC-5 — tasks.md checklist not updated**
- File: `openspec/changes/01-etf-data/tasks.md:5,11,15,21,23`
- Type: contradicts-spec (tasks checklist)
- Severity: minor
- Tasks 1.1, 2.1, 3.1, 4.1, and 4.3 all say "- [ ]" (unchecked). All five corresponding test files exist on disk. The checklist does not reflect reality.
- Suggestion: Tick tasks 1.1, 2.1, 3.1, 4.1, and 4.3 in a `chore:` commit to keep the checklist honest.
- Accept: housekeeping
---

**SC-6 — sort.test.ts: three tests beyond spec scope**
- File: `lib/sort.test.ts:65,72,89`
- Type: scope drift
- Severity: minor
- Task 4.3 lists three scenarios: "sort by `ter` asc/desc, sort by `name` asc, stable ordering on equal values." The test file adds: sort by `return1y` descending (line 65), sort by `aum` descending (line 72), and "does not mutate the original array" (line 89). These are reasonable invariants but have no backing spec requirement.
- Suggestion: Either amend `tasks.md` / the spec to formally enumerate supported sort fields and the non-mutation guarantee, or add a note that these are implementation-quality tests beyond the spec contract.
- Reject: extra tests are good
---

**SC-7 — filter.test.ts: AND-logic and empty-result tests beyond spec scope**
- File: `lib/filter.test.ts:100,111`
- Type: scope drift
- Severity: minor
- Task 4.1 lists: "no-op query, search match, assetClass/region/issuer/distribution multi-select, maxTer boundary." The test adds "multiple filters are combined (AND logic)" (line 100) and "returns empty array when no ETFs match" (line 111). Both are sensible tests and consistent with the spec's intent but have no named scenario.
- Suggestion: Add two short scenarios to the spec (or tasks.md) to cover AND-filter composition and empty-result handling, so the spec formally mandates this behavior.
- Reject: AND-logic test is sensible, leave it
---

**SC-8 — etf-repository.test.ts: "search with no matches" has no spec scenario**
- File: `lib/etf-repository.test.ts:45`
- Type: scope drift
- Severity: minor
- The test `"returns an empty items array and 0 pages when search has no match"` is `it.fails()`. The behavior it tests (search with no matches returns `total: 0`) has no explicit spec scenario.
- Suggestion: Amend spec to add an explicit "no-match search returns empty result" scenario, or note it as a clarifying sub-case of the "Search filter narrows results" scenario.
- Reject: No-match is an obvious sub-case, leave it
---

## Part 2 — Code Review

### Code-Review Findings

**CR-1 — `vi.doMock` mock leaks if assertion throws unexpectedly**
- File: `lib/etf-repository.test.ts`, lines 77–83
- Severity: major
- Category: test correctness / test isolation
- `vi.doMock("@/data/etfs.json", ...)` registers a factory in Vitest's mock map. The cleanup call `vi.resetModules()` at line 82 is only reached if line 81 does not throw. Because the entire block is inside `it.fails()`, any unexpected resolution of the promise (module loads without throwing) causes `it.fails()` to throw its own exception, bypassing line 82 entirely. The `@/data/etfs.json` mock then remains registered for every subsequent test file that dynamically imports `etf-repository`.
- Suggestion: Move mock registration and cleanup into a dedicated `beforeEach`/`afterEach` pair inside the `corrupt data` describe block — `vi.doMock` in `beforeEach`, `vi.unmock` + `vi.resetModules` in `afterEach`. This guarantees cleanup regardless of assertion outcome.
- Accept: bug
---

**CR-2 — Corrupt-data test only asserts "something throws", not a descriptive error**
- File: `lib/etf-repository.test.ts`, line 81
- Severity: major
- Category: test correctness
- `await expect(import("./etf-repository")).rejects.toThrow()` without a message argument will pass for any thrown value, including the stub's `"is not implemented"` string or a raw `TypeError`. The scenario title says "throws a **descriptive** error", implying the message should identify the invalid record. An implementation that throws `new Error("bad")` satisfies this assertion despite violating the intent.
- Suggestion: Add `.toThrow(/BAD/)` or `.toThrow(/invalid/)` so the test pins the message to something diagnostically useful, and will fail against a generic throw.
- Accept: the same as SC-3
---

**CR-3 — Schema rejection tests pass trivially against the stub (false green for 14 tests)**
- File: `lib/etf-schema.test.ts`, lines 44–127
- Severity: major
- Category: test correctness / it.fails() usage
- Every plain `it()` test (lines 44, 49, 54, 59, 66, 73, 79, 85, 92, 97, 101, 107, 112, 117, 122) calls `expect(() => EtfSchema.parse(...)).toThrow()`. The stub at `etf-schema.ts:53` throws `"not implemented"` for every call, so all these assertions are trivially satisfied — not because schema validation is correct, but because the stub always throws. This gives a false green signal: an implementation that throws a generic `Error` on every parse call (correct or invalid input) would also satisfy all fourteen tests.
- Suggestion: These tests cannot be meaningfully separated from the happy-path test until the schema is implemented. They should all be `it.fails()` like line 37, OR the comment should explicitly document the "stub always throws, tests trivially pass" reasoning so reviewers and future implementers understand the red-step state does not validate logic.
- Accept: convert to it.fails()
---

**CR-4 — Upper-bound for generated ETF count contradicts across two tests**
- File: `scripts/generate-seed.test.ts`, lines 38–47
- Severity: major
- Category: test correctness
- The "valid JSON" test at line 40 allows up to 50 records (`LessThanOrEqual(50)`). The "approximately 40 records" test at line 47 allows only up to 45 (`LessThanOrEqual(45)`). An implementation that generates 46–50 records satisfies the first test but fails the second. The two tests cannot both be green for the same output in that range; they express contradictory contracts for the same function.
- Suggestion: Agree on a single range (35–45 is the tighter, more meaningful specification) and use it consistently. Consider extracting `MIN_RECORDS = 35; MAX_RECORDS = 45` as shared constants both tests reference.
- Accept: Contradictory bounds, pick one range
---

**CR-5 — Early `return` inside `it.fails()` silently passes in the green step**
- File: `lib/etf-repository.test.ts`, line 57
- Severity: major
- Category: test correctness / it.fails() usage
- `if (!first) return;` causes the test function to complete without any assertion failure when the list is empty. While under `it.fails()` this is paradoxically caught (no failure thrown → `it.fails()` fails the outer test), after the developer removes `it.fails()` in the green step the same early return silently passes with zero assertions — a broken `list` that returns no items would make this test vacuously green.
- Suggestion: Replace the guard with `expect(first).toBeDefined()` (or `assert(first != null)`). This produces a clear failure message when the list is unexpectedly empty, regardless of whether `it.fails()` is present.
- Accept: Silent pass after removing it.fails() is a real trap
---

**CR-6 — Pagination test hardcodes default page size as literal `20`**
- File: `lib/etf-repository.test.ts`, line 11
- Severity: minor
- Category: test correctness / maintainability
- `expect(result.pages).toBe(Math.ceil(result.total / 20))` computes the expected page count with a literal `20`. If the implementation's default page size is anything other than 20, this assertion fails even when pagination logic is correct. There is no exported `DEFAULT_PAGE_SIZE` constant anywhere in the stub to anchor this value.
- Suggestion: Either export `DEFAULT_PAGE_SIZE` from `etf-repository.ts` and import it here, or derive the check from the result itself: `expect(result.pages).toBe(Math.ceil(result.total / result.items.length))` (valid only when the result is not the last partial page, which needs an appropriate fixture).
- Accept: Export DEFAULT_PAGE_SIZE
---

**CR-7 — Search-by-ticker-prefix assertion uses inconsistent case sensitivity**
- File: `lib/filter.test.ts`, lines 53–55
- Severity: minor
- Category: test correctness
- The assertion is `e.ticker.startsWith("IW") || e.name.toLowerCase().includes("iw")`. The left operand is a case-sensitive prefix check (`startsWith("IW")`); the right operand normalises the name to lowercase. A correct case-insensitive implementation returning a ticker stored as `"iwda"` would fail the left operand and silently pass only if the name contained "iw" — hiding the mismatch. The fixture happens to store all tickers in uppercase, masking the issue.
- Suggestion: Make both sides consistent: `e.ticker.toUpperCase().startsWith("IW") || e.name.toUpperCase().includes("IW")`.
- Accept: Case inconsistency
---

**CR-8 — `makePrices()` duplicated verbatim in three test files**
- File: `lib/etf-schema.test.ts:4`, `lib/filter.test.ts:5`, `lib/sort.test.ts:5`
- Severity: minor
- Category: maintainability
- All three implementations are byte-for-byte identical (252-entry date+price array). The schema spec pins the price count at exactly 252. If that count changes, all three files must be updated in sync — a three-way drift hazard.
- Suggestion: Extract to `lib/test-fixtures.ts` (pure, no React/Next imports per AGENTS.md convention) and import from there. The `BASE` fixture could live there too, eliminating the second duplication between `filter.test.ts` and `sort.test.ts`.
- Accept: Extract shared fixture, prevents drift
---

**CR-9 — `filterEtfs` imports `ListQuery` from `etf-repository`, creating a latent circular dependency**
- File: `lib/filter.ts`, line 3
- Severity: minor
- Category: maintainability / architecture
- `import type { ListQuery } from "./etf-repository"` means `filter.ts` depends on a sibling module (`etf-repository.ts`) that in turn will import `filter.ts`. This creates a latent circular-dependency risk once `etf-repository.ts` is implemented. `ListQuery` also carries `sortBy`, `sortDir`, `page`, `pageSize` which are irrelevant to filtering, widening the surface of `filterEtfs` beyond its responsibility.
- Suggestion: Define a narrow `FilterQuery` type in a shared file (e.g., `lib/query-types.ts`) or directly in `filter.ts`, and have `ListQuery` extend/intersect it. Both `filter.ts` and `etf-repository.ts` then depend on the shared type rather than on each other.
- Reject: Circular dep is latent only, defer to implementation phase
