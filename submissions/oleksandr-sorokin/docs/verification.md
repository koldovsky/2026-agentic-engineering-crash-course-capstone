# Verification

**Principle:** evidence, not claims. Every "it works" statement is backed by a command, its output,
and a commit SHA.

---

## Layers

### 1 · Unit tests (Vitest)

Covers pure logic in `lib/`:

| File | What is tested |
|---|---|
| `lib/filter.test.ts` | `filterEtfs()` — each filter type alone, combined filters, empty result |
| `lib/sort.test.ts` | `sortEtfs()` — ascending / descending for each `SortField` |
| `lib/format.test.ts` | `formatPercent()`, `formatAum()` — boundary values, negatives |
| `lib/etf-repository.test.ts` | `list()` paging, `getByTicker()` hit / miss |
| `lib/smoke.test.ts` | Smoke: import the repository, confirm it returns ≥ 1 ETF |

Command: `pnpm test`  
Red → green commit pattern required (test commit before implementation commit).

### 2 · Component tests (Vitest + Testing Library)

Covers rendering and interaction:

| Component | What is tested |
|---|---|
| `EtfTable` | renders column headers; clicking a header changes sort indicator |
| `EtfFilters` | selecting an asset class updates the URL searchParam |
| `EtfPagination` | "Next" / "Prev" disabled at boundaries |

### 3 · End-to-end tests (Playwright)

Three required journeys:

| # | Journey |
|---|---|
| J1 | Filter by asset class → open details → click "Back to list" → filters still set |
| J2 | Copy the URL with filters → open in a new page → same results |
| J3 | Navigate to `/etfs/UNKNOWN` → 404 page shown |

Command: `pnpm test:e2e`

### 4 · Type check + lint

`pnpm typecheck` = `next typegen && tsc --noEmit`  
`pnpm lint` = `eslint`

Both run in `pnpm check`. Zero errors required before merge.

### 5 · Agents:check (sync drift)

`pnpm agents:check` — fails if `.agents/` and `.claude/` are out of sync.
Catches accidental edits to generated copies.

---

## `pnpm check` — the gate

```
pnpm check = pnpm typecheck && pnpm lint && pnpm test && pnpm agents:check
```

This is the minimum bar for any PR. A step PR must show `pnpm check` green in its description.

---

## `pnpm verify` — the full report

`scripts/verify-report.mjs` runs `pnpm check`, `pnpm build`, and `pnpm test:e2e`.
It writes a Markdown report to `docs/evidence/verify/<date>-<short-sha>.md` containing:

- Git SHA and clean-tree flag.
- Each command, its exit code, and tail of output.
- Test counts and duration.

This report is committed in every step PR — it serves as the CI substitute (see ADR-003 / Part 4 of the plan).

---

## Stop hook — micro-loop

`.agents/hooks/check-on-stop.mjs` runs `pnpm check` when the agent signals it is done.
If it exits non-zero, the agent gets the failure back and must fix it before stopping.
The hook respects `stop_hook_active` to prevent infinite loops.
Output appears in `.agent-log/actions.jsonl` — evidence that the loop ran.

---

## Red → green commit pattern

For every OpenSpec change:

1. `test(<id>): <description> (red)` — failing tests committed first.
2. `feat(<id>): <description>` — implementation; `pnpm check` must be green.

This pair is the strongest evidence for the Verification practice in the RUBRIC.
It is visible in the git log and linked from the PR description.

---

## Evidence locations

| Artefact | Path |
|---|---|
| Verify reports | `docs/evidence/verify/<date>-<sha>.md` |
| Scope-guard block proof | `docs/evidence/scope-guard-blocked.md` |
| Agent activity summary | `docs/evidence/agent-activity.md` (Step 11) |
| Loop logs | `docs/loops/` (Step 5+) |
| Reviewer findings | `docs/reviews/<change-id>.md` (Step 5+) |
| Final evidence index | `docs/evidence.md` (Step 11) |
