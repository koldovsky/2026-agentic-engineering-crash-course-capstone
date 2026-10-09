# Review loop log

Written by `scripts/review-loop.sh` (`npm run loop -- <paths>`); one section per run.
Rules: `docs/spec.md`, "Development rules".

## Run 2026-10-09 00:02 - scope `src/server`, base `9d676e0`, max 3 fix passes

### Iteration 1
- Gate: **green** (Tests  294 passed (294))
- Review: **FAIL**
  - [medium] src/app/api/[...path]/route.ts:6-7 - The 413 `body-too-large` check runs before `handleApi` (which does the 404/405/403 checks), so a POST with an oversized body to an unknown path or wrong method returns 413 instead of 404/405, contradicting the spec's stated check order (R26 "Order of checks"). No test exercises this because `api.test.ts` calls `handleApi` directly with an already-materialized body string, bypassing `route.ts` entirely. - Move the size check after path/method/origin resolution (or reorder: read the body only after `dispatch` determines the path/method/origin are valid), or restructure `handleApi` to accept the raw `Request` so one code path enforces the whole order.
- Fix pass (working tree vs base): 3 files changed, 39 insertions(+), 17 deletions(-)
  > Fixed:
  > - `src/app/api/[...path]/route.ts:6-7` — moved the 413 body-size check to run after a new `routeError` check (path/method/origin), so unknown paths and wrong methods now correctly return 404/405 even with an oversized body, matching spec R26's stated check order. Added `routeError` export in `src/server/api.ts` (shared with `dispatch`) and a regression test in `src/app/api/[...path]/route.test.ts` that exercises `route.ts` directly (not just `handleApi`), confirmed red → green.
  > 
  > Skipped: none — the only finding was fixed.

### Iteration 2
- Gate: **green** (Tests  296 passed (296))
- Review: **PASS**
  - [low] src/server/data.ts:50 - `getData` rebuilds a JSON array by string-concatenating stored rows (`` `[${...join(",")}]` ``) instead of parsing/remapping each row - works only because every stored row is guaranteed valid JSON from `JSON.stringify`; fragile pattern, no functional bug today. Fix: `JSON.stringify(attemptRows.map(r => JSON.parse(r.data)))` for clarity (optional, not required).

**Stopped:** converged: gate green and no high or medium findings after 1 fix pass(es). Changes are left uncommitted for the author to review.
