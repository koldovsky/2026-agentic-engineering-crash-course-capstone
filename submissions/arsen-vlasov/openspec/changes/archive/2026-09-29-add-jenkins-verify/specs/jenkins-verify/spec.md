# Spec Delta

## Purpose

Turns one Jenkins build of the autotest jobs into a verdict — PASS, FAIL or NOT-EARNED — that an
agent can act on without reading raw Jenkins data, and that never reports green when no tests ran.

## ADDED Requirements

### Requirement: Verdict is earned only by executed tests

The CLI SHALL report PASS only when the build finished, its test report exists, at least one test
was executed (passed or failed, not skipped), and no failure is new. Every other finished state that
is not FAIL SHALL be reported as NOT-EARNED, with the reason.

#### Scenario: Green build with executed tests

- **WHEN** the build result is SUCCESS and the report has 120 passed, 0 failed, 3 skipped tests
- **THEN** the verdict is PASS and the summary shows `executed 120 · passed 120 · failed 0 · skipped 3`

#### Scenario: Zero executed tests

- **WHEN** the build result is SUCCESS and the report has 0 passed, 0 failed and 45 skipped tests
- **THEN** the verdict is NOT-EARNED with the reason `no test was executed`, not PASS

#### Scenario: No test report

- **WHEN** the build result is FAILURE and Jenkins has no test report for it
- **THEN** the verdict is NOT-EARNED with the reason `no test report — the build broke before or outside the tests`

#### Scenario: Build still running or aborted

- **WHEN** the build is still running, or its result is ABORTED or NOT_BUILT
- **THEN** the verdict is NOT-EARNED and the reason names that state

### Requirement: Failures are classified against a known-failures list

The CLI SHALL read a tracked list of known failures and classify every failed test as **new** (not in
the list) or **known** (in the list). It SHALL report as **fixed** every listed test that passed in
this build, and as **stale** every listed test that this build did not contain at all. A test is
identified by its suite and name.

#### Scenario: Only known failures

- **WHEN** 2 tests failed, both are in the known-failures list, and 100 tests passed
- **THEN** the verdict is PASS, and both failures are listed under `known` with their recorded reason

#### Scenario: One new failure among known ones

- **WHEN** 3 tests failed, 2 of them are in the known-failures list and 1 is not
- **THEN** the verdict is FAIL, the 1 test is listed under `new`, and the 2 under `known`

#### Scenario: A known failure now passes

- **WHEN** a test in the known-failures list passed in this build
- **THEN** it is listed under `fixed` with the advice to remove its entry, and the verdict is not affected

#### Scenario: A broken test counts as a failure

- **WHEN** the report marks a test as broken (it errored outside an assertion, for example a timeout in a fixture)
- **THEN** it is counted and classified exactly like a failed test

#### Scenario: A listed test is absent from the build

- **WHEN** a test in the known-failures list does not appear in the build's report
- **THEN** it is listed under `stale`, and the verdict is not affected

### Requirement: Output is compact and safe

The CLI SHALL print a summary of at most one screen: job, build number, link, result, counts, verdict,
and for each new failure the test, its suite and the first line of its error. It SHALL NOT print raw
Jenkins JSON, full stack traces, or any credential.

#### Scenario: Many failures

- **WHEN** 40 tests failed and none is known
- **THEN** the first 15 new failures are listed one line each, followed by `…and 25 more`

#### Scenario: Error text contains a credential

- **WHEN** a failure's error line contains `Authorization: Bearer eyJ…`
- **THEN** the printed line shows `Bearer <redacted>` instead of the token

#### Scenario: Jenkins rejects the credentials

- **WHEN** Jenkins answers 401 or 403
- **THEN** the CLI exits with the access-error code and names the missing or rejected variable, without printing its value

### Requirement: Exit codes follow the verdict

The CLI SHALL exit 0 for PASS, 1 for FAIL, 2 for NOT-EARNED and 3 for a usage or access error, so a
script or an agent can branch on the code alone.

#### Scenario: Branching on the code

- **WHEN** the verdict is NOT-EARNED
- **THEN** the exit code is 2, not 0

### Requirement: Builds can be read offline

The CLI SHALL accept a saved build (build data plus test report in one JSON file) instead of calling
Jenkins, and SHALL produce the same verdict and output for it as for the live build.

#### Scenario: Saved build

- **WHEN** the CLI is given a saved file of a build that had 1 new failure
- **THEN** it prints the same summary and exits 1, with no network call
