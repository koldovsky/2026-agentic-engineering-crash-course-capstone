---
description: Readability standards for tests and helpers
globs: "**/*.{ts,tsx,js,jsx}"
alwaysApply: false
paths:
  - "**/*.{ts,tsx,js,jsx}"
---

# Readable code: clear at first glance

The code must be clear to someone who did not write the test. A reader should see **what happens** at first glance.

## Principles

1. **Names describe the action and its context.** Do not use `process`, `handle`, or a meaningless `doVerify`.

2. **Helper files** have one to three sentences at the top when the purpose is not obvious without them. Example: `investment-and-capital-flows.ts` (login, access, sidebar builders).

3. **Step order matches scenario order.** The steps go from top to bottom, with no jumps.

4. **Types as documentation.** Use types such as `ExpectedInAdmin`, `FillSubmitAndVerifyParams`. Never use `data: any`.

5. **Specs are scenarios. Helpers are instructions.**
   - A spec contains steps, conditions, and `linkTestCase(id)`. The file name and the test name contain no TC ID.
   - Each large domain gets its own `.spec.ts`. Never make a single god file of 1000+ lines.
   - Do not write explanatory comments in specs. When something is unusual, express it as a `test.step` in business language.

## Auth and users (readability)

- A spec must not read "opened login, typed email". It must read "logged in a student". Use a helper or an already authenticated session for this.
- Dynamic student: `const testUser = testUserRegistry.createStudent()` at the start of the test. Do the cleanup in `afterEach`.
- Static user (expensive read-only setup): `userManager.getLmsUser(key)`. The decision and the key must both be obvious (`test-user-lifecycle.md`).

## What to do in review

- Read the code again as a newcomer. Is it clear **what** happens, without decoding?
- If the code needs decoding, rename it or extract it into a helper with a descriptive name.
