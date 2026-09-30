---
description: No expect in Playwright specs — assertions belong in POM and helpers
globs: tests/specs/regression/**/*.spec.ts
alwaysApply: false
paths:
  - "tests/specs/regression/**/*.spec.ts"
---

# Playwright specs: no `expect` in specs

## Rule

- **Forbidden** in `tests/specs/regression/**/*.spec.ts`: `expect(...)`, `toBe...`, `toHave...`, `assert`, custom matchers.
- **API specs are the exception.** `tests/specs/api/**` asserts on the response directly.
  There is no page object to hold the check. See `api-test.md`: every `expect()` in an API spec must
  be inside a `test.step()`.
- **Allowed**: calls to methods that contain the assertions **inside** them.

## Where assertions go

| Layer | When to use | Examples |
|------|-------------------|---------|
| **POM** | UI of a single page or component | `courseProgramPage.shouldSeeLockedBlock(name)` |
| **Assertion helpers** | Cross-cutting or domain invariants | `CertificateVerificationAssertions.verifyQrUrlReturns404(...)` |
| **ui-assertions** | Inside POM, to avoid duplicating messages | `expectVisible(locator, 'description')` from `utils/assertions/ui-assertions.ts` |

The `ui-assertions` functions (`expectVisible`, `expectText`, `expectContainText`, `expectCount`, `expectEnabled`, `expectHidden`) are **for POM and helpers only**. Never use them in specs.

## What a spec should look like

- Scenario shape: `test.step → action → should*`.
- A `test.step` contains only **actions** and **calls to should methods**.
- Make API calls through fixtures and helpers (`CourseProgressHelper`, `createCalendarActivity`). Never use `new CourseApiClient()` in the test body.

## Structuring large specs

- Split by domain into separate files (example: `investment-and-capital/` → `card-visibility`, `program-availability`, `block-availability`, `calendar`).
- Put shared preconditions and login into `tests/helpers/` or `tests/specs/<domain>/helpers/`.

## Exceptions

For a flaky assertion, first add or extend a method in the POM or helper. Then call that method from the spec.
