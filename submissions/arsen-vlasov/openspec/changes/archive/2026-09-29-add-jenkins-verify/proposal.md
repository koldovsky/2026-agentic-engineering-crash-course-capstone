# Proposal

## Why

Three Jenkins jobs run the regression on a schedule (`stage-api-tests`, `lms-stage-regression-tests`,
`admin-stage-regression-tests`), and today "is the build fine?" is answered by opening Jenkins and
reading it by eye. An agent asked the same question either pulls kilobytes of raw JSON into its
context or answers from the build colour, and a green colour does not prove that tests ran.
We need one command that turns a build into a verdict an agent and a human can both trust.

## What Changes

- A CLI that reads one Jenkins build (job + number, or the last completed one) and prints a compact
  verdict: **PASS**, **FAIL** or **NOT-EARNED**, with the failing tests grouped as new, known or fixed.
- A tracked list of known failures that works as a ratchet: a known failure does not turn a build red,
  a known failure that now passes is reported so the entry gets removed, and new entries are a human decision.
- An offline mode that reads a saved build instead of calling Jenkins, used by the tests.
- The skill `jenkins-verify` that tells the agent to run the CLI, and what to do with each verdict.
- The CLI's tests run as part of `npm run check`.

## Capabilities

### New Capabilities

- `jenkins-verify`: turning one Jenkins build of the autotest jobs into a trustworthy verdict.

### Modified Capabilities

_none_

## Impact

- New: `scripts/ci/jenkins-report.mjs`, its tests and fixtures, `ci/known-failures.json`,
  `.claude/skills/jenkins-verify/SKILL.md`.
- `package.json`: a `harness:test` script, added to `check`. No new runtime dependency.
- Reads `JENKINS_URL`, `JENKINS_USER`, `JENKINS_API_TOKEN` from the environment; the token never
  appears in output.
- Read-only towards Jenkins: the CLI never triggers, stops or edits a build.
