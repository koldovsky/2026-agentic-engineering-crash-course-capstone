# Proposal

## Why

The definition of done asks for one green run of a new or changed spec on stage. One green run does
not show that a spec is stable. The last three builds of `lms-stage-regression-tests` (414, 415, 416)
show flaky tests that pass in one build and fail in the next:

| Test | 414 | 415 | 416 | Error |
|---|---|---|---|---|
| `activity-calendar.spec.ts` | fail | pass | fail | a different error each time: the activity is not visible, the view mode options do not load |
| `block-availability.spec.ts` | fail | fail | fail | a different test fails each time (14, 16, 11): the lesson progress or the API call |
| `v2-card-visibility.spec.ts` (Extended) | pass | fail | pass | the course progress in the sidebar is not 7% |
| `pro-trading-demo-subscription.spec.ts` (1-3) | fail | pass | pass | the element is not attached to the DOM |
| `recommendations-access.spec.ts` (VIP, final test passed) | pass | pass | fail | the element is outside of the viewport |

Today a person fixes a flaky test by hand: run it, copy the error, ask the agent for a fix, run it
again. The capstone rubric also names loop engineering as a practice. Its evidence is a loop that
really runs, with a log of the iterations and the stop reason.

## What Changes

- A new script `scripts/loop/stabilize.mjs` and the command `npm run loop:stabilize -- <spec>`.
- The loop runs the spec on stage with `--repeat-each=5`. On a failure, it gives a short failure
  summary to `claude -p`, and the agent fixes the test code. Then the loop runs the spec again.
- The loop stops on `GREEN` (5 of 5 and a green `npm run check`) or on a hard limit: 3 attempts,
  20 minutes, 3 USD, or a stall of 2 attempts.
- The agent can only read and edit `page-objects/`, `tests/` and `utils/`. A hash of the protected
  files and a weakening check on the diff stop the loop when the agent goes out of these limits.
- The agent can also say that the product is wrong. Then the loop stops and names the `bug-report`
  skill.
- Each loop writes a report to `docs/loops/`. The loop never commits.

## Capabilities

### New Capabilities

- `stabilize-loop`: a bounded loop that runs one spec until it is stable, with an agent that fixes the
  test code between the runs.

### Modified Capabilities

_none_

## Impact

- New: `scripts/loop/stabilize.mjs`, `scripts/loop/stabilize.test.mjs`, `docs/loops/index.md`.
- Changed: `package.json` (the `loop:stabilize` script, no new dependency), `docs/index.md`,
  `docs/harness/index.md`.
- A live loop runs tests on stage and spends agent money. The limits cap both.
