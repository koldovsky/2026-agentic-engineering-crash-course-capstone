# Proposal

## Why

The first real use of `ci/known-failures.json` (three entries, two jobs) showed that one list shared
by three jobs makes every job report the other jobs' entries as **stale** — "not in this build, check
and remove". Following that advice would delete valid entries and turn real known bugs back into
"new" failures elsewhere.

## What Changes

- A known-failures entry names the job it belongs to (`job`).
- `stale` is reported only for entries of the job being verified. Entries without `job` keep the old
  behaviour and are checked against every job.
- Classification into `new`, `known` and `fixed` is unchanged: it matches by test identity, and test
  identities do not collide across the jobs.

## Capabilities

### New Capabilities

_none_

### Modified Capabilities

- `jenkins-verify`: the known-failures requirement. The `stale` rule is scoped to the job.

## Impact

`scripts/ci/jenkins-report.mjs`, its tests and fixtures, `ci/known-failures.json` (gains `job`),
and the entry format in `.claude/skills/jenkins-verify/SKILL.md`.
