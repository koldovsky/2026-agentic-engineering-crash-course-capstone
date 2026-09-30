# Tasks

## 1. Tests first (red)

- [x] 1.1 Unit tests for `parseArgs`, `summarize`, `signature`, `decide`, `weakening`, `changedProtected`, `agentVerdict`
- [x] 1.2 `runLoop` tests with fake `deps`, one for each stop reason in the spec
- [x] 1.3 See them red

## 2. Implementation (green)

- [x] 2.1 The pure functions and `runLoop` in `scripts/loop/stabilize.mjs`
- [x] 2.2 The real `deps`: Playwright, `claude -p`, git, the hash, the report
- [x] 2.3 `npm run loop:stabilize`, `docs/loops/index.md`
- [x] 2.4 `npm run check` green

## 3. Live runs

- [x] 3.1 A loop on `activity-calendar.spec.ts` on stage, with the report in `docs/loops/`
- [x] 3.2 A loop on a second flaky test from builds 414–416

## 4. Close

- [x] 4.1 Docs (`docs/harness/index.md`, `docs/index.md`), autonomy log, the capstone plan status
- [x] 4.2 `openspec validate --strict`, archive
