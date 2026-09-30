# Spec Delta

## Purpose

A loop runs one Playwright spec on stage again and again. When a test fails, an agent gets the failure
and fixes the test code. The loop stops on a stable green result or on a hard limit. It never commits.

## ADDED Requirements

### Requirement: Green means five passes and a green check

The loop SHALL run the target with `--repeat-each=5` and `--retries=0`. The stop reason SHALL be
`GREEN` only when all of these are true:

- at least one test was executed
- every executed test passed
- the agent made at least one fix attempt
- `npm run check` exits 0.

When the first run passes, the stop reason SHALL be `NOT_REPRODUCED`, and the agent SHALL NOT start.
When a run executes 0 tests, the stop reason SHALL be `NOT_EARNED`.

#### Scenario: Five of five after a fix

- **WHEN** the first run has 1 failure, the agent fixes it, the second run passes 5 of 5, and `npm run check` exits 0
- **THEN** the loop stops with `GREEN` after 1 attempt and exits 0

#### Scenario: Zero tests is not green

- **WHEN** the run executes 0 tests, for example because of a wrong `--grep`
- **THEN** the loop stops with `NOT_EARNED`, exits 1, and the agent does not start

#### Scenario: The failure does not come back

- **WHEN** the first run passes 5 of 5
- **THEN** the loop stops with `NOT_REPRODUCED`, exits 0, and the agent does not start

#### Scenario: The tests pass, but the check fails

- **WHEN** the run passes 5 of 5 after an attempt, and `npm run check` exits 1
- **THEN** the loop does not stop with `GREEN`, and the next attempt gets the check output as the failure

### Requirement: Hard limits stop the loop

The loop SHALL stop before the next agent attempt when it reaches one of these limits. Each limit has
an option.

- `MAX_ATTEMPTS`: 3 fix attempts.
- `TIME`: 20 minutes of wall time. The loop SHALL stop a test run or an agent run that is still
  running at the limit.
- `BUDGET`: 3 USD of agent cost, from `total_cost_usd`. Each agent run SHALL get `--max-budget-usd`
  equal to the remaining budget.
- `STALL`: the same failure signature in 3 runs in a row, so 2 attempts did not change it. The
  signature is the failed test titles and the first line of each error, with the numbers removed.

#### Scenario: Three attempts

- **WHEN** the run after attempt 3 fails, and each run failed with a different error
- **THEN** the loop stops with `MAX_ATTEMPTS` and exits 1

#### Scenario: Budget

- **WHEN** the agent cost is 3.20 USD after attempt 2, and the next run fails
- **THEN** the loop stops with `BUDGET` before attempt 3

#### Scenario: Stall

- **WHEN** runs 0, 1 and 2 fail in the same test with `Calendar view mode dropdown options did not load within 15000ms`, and only the numbers change
- **THEN** the loop stops with `STALL` before attempt 3

#### Scenario: Time

- **WHEN** the 20 minutes end during a test run
- **THEN** the loop stops that run and stops with `TIME`

### Requirement: The agent cannot weaken the test or change the harness

The agent SHALL get only `Read`, `Grep`, `Glob`, and `Edit` in `page-objects/`, `tests/` and `utils/`.
It SHALL run with the project settings only, so the project hooks apply and the local allow list does
not. It SHALL get no MCP servers, and it SHALL NOT run Playwright.

The loop SHALL hash the protected files before and after each attempt. The protected files are the
tracked files in `.claude/`, `scripts/`, `ci/`, `.githooks/`, `openspec/`, `test-data/` and `config/`,
the baseline files, `package.json`, `package-lock.json` and `playwright.config.ts`. A changed hash
SHALL stop the loop with `PROTECTED`.

After each attempt, the loop SHALL check the diff of `page-objects/`, `tests/` and `utils/`. An added
line with one of these is weakening: `test.skip`, `test.fixme`, `test.only`, `test.fail`,
`waitForTimeout`, `setTimeout`, `retries`. A diff that removes more `should…(` calls than it adds is
weakening too. Weakening SHALL stop the loop with `WEAKENED`.

On `PROTECTED` and `WEAKENED`, the loop SHALL put the diff in the report. Then it SHALL restore the
tracked files that changed.

#### Scenario: A skip

- **WHEN** an attempt adds `test.skip(` to the spec
- **THEN** the loop stops with `WEAKENED`, the report has the diff, and the spec is restored

#### Scenario: A removed check

- **WHEN** an attempt removes `await activityCalendarPage.shouldSeeActivity(activityTitle);` and adds no `should` call
- **THEN** the loop stops with `WEAKENED`

#### Scenario: A known-failures entry

- **WHEN** the hash of `ci/known-failures.json` changes during an attempt
- **THEN** the loop stops with `PROTECTED`, and the file is restored

### Requirement: The agent can say that the product is wrong

The prompt SHALL ask for one last line: `VERDICT: FIXED — …`, `VERDICT: PRODUCT_BUG — …` or
`VERDICT: UNKNOWN — …`. On `PRODUCT_BUG`, the loop SHALL stop with `PRODUCT_BUG` and name the
`bug-report` skill as the next step. When an agent run gives no JSON result, or the result is an error,
the loop SHALL stop with `AGENT_ERROR`.

#### Scenario: A product bug

- **WHEN** the agent ends with `VERDICT: PRODUCT_BUG — the role search does not filter the table`
- **THEN** the loop stops with `PRODUCT_BUG`, exits 1, and the report names `bug-report`

#### Scenario: The agent fails

- **WHEN** the agent process exits with no JSON on stdout
- **THEN** the loop stops with `AGENT_ERROR` and exits 1

### Requirement: Each loop leaves a report and no commit

The loop SHALL start only when git has no uncommitted change in a tracked file. It SHALL never commit.
At the end, it SHALL write `docs/loops/<date>-<slug>.md` and add a row to `docs/loops/index.md`. The
report SHALL have one row per run with these columns:

- the run number
- the passed and executed counts
- the failure signature
- the agent cost and the time
- the changed files.

The report SHALL also have the stop reason, the total cost, the verdict line of each attempt and the
final diff. The report SHALL pass `docs:lint` and `docs:ste`. The exit code SHALL be 0 for `GREEN` and
`NOT_REPRODUCED`, 1 for the other stop reasons, and 3 for a usage error.

#### Scenario: A dirty tree

- **WHEN** a tracked file has an uncommitted change at the start
- **THEN** the loop exits 3 and runs nothing

#### Scenario: The report

- **WHEN** the loop stops with any stop reason
- **THEN** the report exists, `docs/loops/index.md` links it, and git has no new commit
