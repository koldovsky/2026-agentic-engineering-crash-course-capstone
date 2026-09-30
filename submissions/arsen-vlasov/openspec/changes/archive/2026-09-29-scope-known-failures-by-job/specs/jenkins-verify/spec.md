# Spec Delta

## MODIFIED Requirements

### Requirement: Failures are classified against a known-failures list

The CLI SHALL read a tracked list of known failures and classify every failed test as **new** (not in
the list) or **known** (in the list). It SHALL report as **fixed** every listed test that passed in
this build, and as **stale** every listed test that this build did not contain at all, among the entries that belong
to the verified job or name no job. A test is identified by its suite and name.

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

- **WHEN** a known-failures entry for this job, or with no job, names a test that does not appear in the build's report
- **THEN** it is listed under `stale`, and the verdict is not affected

#### Scenario: An entry for another job

- **WHEN** a known-failures entry names job `lms-stage-regression-tests` and the verified build is from `admin-stage-regression-tests`
- **THEN** the entry is not listed under `stale`
