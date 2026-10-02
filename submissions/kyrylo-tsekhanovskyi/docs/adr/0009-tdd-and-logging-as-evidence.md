# 0009. TDD with red evidence; reviews and retry-limit stops logged

- Status: accepted · Date: 2026-09-28 · Decided by: human

## Context
The commit gate allows only green commits, yet TDD needs a red phase. The course also asks for
evidence of how much autonomy the agents had.

## Decision
- For every task: checks from the OpenSpec scenarios → a red run → green → refactor. The red run
  (`check --red <task>`) must fail on assertions, not on compile errors or an empty run, and it is saved
  to `openspec/changes/<change>/evidence/<task>-red.txt`. Tests and code land in the same green commit,
  so the gate needs no exception.
- `npm run check` fails when a ticked `[checks]` task has no evidence file.
- Every checker review goes into `docs/reviews/` plus a row in `docs/logs/reviews.md`. The Resolution
  is filled in before the commit.
- Every retry-limit stop (maker 5 attempts, Stop hook 3 re-entries, checker 2 failed runs) is logged in
  `docs/logs/retry-stops.md` before any further action, and mirrored in the autonomy log.

## Consequences
- The evidence can be checked mechanically instead of trusted.
- Phase 1 has no OpenSpec change yet, so the red run for the harness scripts' own tests is kept in
  `docs/evidence/phase-1-harness-red.txt`.
