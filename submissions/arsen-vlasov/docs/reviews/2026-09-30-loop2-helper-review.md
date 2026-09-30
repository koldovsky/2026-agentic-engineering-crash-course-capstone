# Review of the loop 2 fix in `api-helper.ts`

- **Maker:** the inner agent of the stabilize loop (`opus`), in 2 attempts. See
  [../loops/2026-09-30-block-availability.md](../loops/2026-09-30-block-availability.md).
- **Checker:** a separate read-only agent on a different model (`sonnet`). It got the diff, the
  failure texts and four questions: weakening, root cause, blast radius, project rules.
  `spec-reviewer` was not used, because the change is a shared helper and has no test case.
- **Verdict:** CHANGES.

## What the checker found

1. The block wait is unconditional. With `skipHomework: true`, `completeFullBlock` skips the homework,
   so the block can stay not completed. Then the new wait fails after 30 s. Nine calls use
   `skipHomework: true`, and the loop ran none of them.
2. The second wait contradicts the JSDoc of `completeAllAvailableCourseBlocksInOrder`. It also repeats
   the predicate `hasCompletedAllCourseContentByProgressSnapshot`.
3. Other callers with the default `skipHomework: false` were not run either: `mentor-stats-calculation`
   and `v2-card-visibility`.
4. Small issues: the literal `30` is written twice, one progress fetch is not necessary, and each poll
   adds an Allure step.
5. The fix hides a progress lag of the product from the specs. Nobody recorded that lag.

The checker found no spec assertion that became weaker. It also found that the root cause of attempt
1 agrees with the code.

## What happened next

The agent ran every spec that calls the changed helpers once on stage, with 4 workers. The command
was `ENV=stage HEADLESS=true npx playwright test <7 specs> --workers=4`. The result: 10 passed and
10 failed, in 5.3 min.

| Failed test | Error | Cause |
|---|---|---|
| `block-availability` 8 | `Course progress did not mark block … as completed`, `api-helper.ts:183` | the new block wait |
| `block-availability` 18 (BASIC) | the same | the new block wait |
| `block-availability` 18 (VIP) | the same | the new block wait |
| `change-name-verification` | the same | the new block wait |
| `homework-preview-after-upgrade` | the same | the new block wait |
| `block-availability` 15 and 16 | `POST /api/v2/test/course-progresses/mark-completed` is not 200 | not the change. Test 16 failed the same way in Jenkins build 415 |
| `mentor-stats-calculation` 1 and 3 | `GET /course/…/progress` gives 404 for 30 s | not the change. It fails before the helper call |
| `homework-submission-upgrade-flow` | `GET /zoho/leads/contact/search` times out after 120 s | not the change. Zoho |

The 5 tests with the new block wait did not fail in builds 414, 415 and 416. So the fix makes 2 flaky
tests pass and breaks 5 stable tests. The checker found this risk in the code. The stage run showed
it. The loop result `GREEN` was true only for its target (`--grep "(11|14)\. "`).

The fix is not committed. The human decides what to do with it.

**Decision of the human (2026-09-30):** discard the fix, and do not run the fix loop on these tests
again. The agent removed the change with `git checkout`. The diff stays in the loop 2 report. The
progress lag goes to the tech-debt tracker.

## Full report of the checker

```text
Verdict: CHANGES. I could not confirm that the first wait is safe for skipHomework: true callers.

1 Weakening / masking: no spec assertion was loosened (git diff --stat -- tests is empty). Waiting in
  a precondition helper is legitimate if the backend is eventually consistent. The cost: the specs
  can no longer see a progress lag in the product, and no note records that lag.
  Evidence: api-helper.ts:168,238-243; docs/loops/2026-09-30-block-availability.md (F1, F2).
2 Root cause: attempt 1 is consistent with the code. getAvailableBlockIds filters isCompleted ===
  false and only polls until the list is non-empty, so a stale snapshot re-selects block 1
  (length === 1) and completeFullBlock does nothing on it. Attempt 2 is plausible:
  hasCompletedAllCourseContentByProgressSnapshot returns true on isCompleted alone.
  Evidence: api-helper.ts:98-110,166,274-283; response-transform-helper.ts:121-135;
  course-api.ts:306-335.
3 Blast radius: high risk.
  - The block wait is unconditional, but completeFullBlock skips homework when skipHomework: true
    (course-api.ts:327-329). The block may never reach isCompleted: true, and the wait throws after
    30 s. Callers with skipHomework: true, none of them in the 10/10 run:
    block-availability.spec.ts:93 (test 8), :688 (test 18, BASIC and VIP),
    change-name-verification.spec.ts:65,134, homework-submission-upgrade-flow.spec.ts:62,112,
    homework-preview-before-upgrade.spec.ts:63,67, homework-preview-after-upgrade.spec.ts:62,115.
  - The second wait contradicts the JSDoc (api-helper.ts:188-191) and duplicates :278-283.
  - Unverified default callers: mentor-stats-calculation.ts:60, v2-card-visibility.spec.ts:110,171.
4 Project rules: mostly compliant. secondsToMs(30) is within the limit, toPass with DateHelper follows
  no-hardcoded-waits.md, and expect in utils is already used at :43,66,86,104. Gaps: 30 written twice
  (:183, :267) with no named constant, a redundant fetch at :219, one Allure step per poll, and
  lessons.total === 0 passes vacuously.

Exact changes requested:
1 Do not wait on block isCompleted when skipHomework is true, or poll lessonProgresses for video and
  quiz only. Or run on stage: change-name-verification.spec.ts and
  block-availability.spec.ts --grep "(8|18)\. ", plus one mentor-stats spec.
2 One named constant for the 30 s. Reuse the predicate from :278-283. Update the JSDoc at :188-191.
3 Record the progress-lag observation (tech-debt tracker or bug-report). Decide there whether it is a
  product defect.
4 Optional: drop the redundant fetch at :219.
```
