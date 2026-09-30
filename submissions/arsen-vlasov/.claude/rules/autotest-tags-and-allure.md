---
description: Playwright tags and Allure labels — dictionary values only
globs: tests/specs/**/*.spec.ts
alwaysApply: false
paths:
  - "tests/specs/**/*.spec.ts"
---

# Tags and Allure labels (PRJ-6449)

## 1) Playwright tags

- Put filter tags into `test.describe(..., { tag: [...] }, ...)` or `test(..., { tag: [...] }, ...)`.
- Take tags **only** from `utils/constants/autotest-labels.ts` (`AUTOTEST_PLAYWRIGHT_TAGS`).
- Axes: product (`lms` / `adminPanel` / `api`) + `domain` + `capability` + `integration` when it is relevant.
- A tag must not repeat the path. Example: a test in `subscriptions-and-payments/` gets no tag with that name.
- Use two `domain` tags only for a test that really crosses domains. Do not use them as a copy of the folder structure.
- Use `integration.X` when the merchant is the subject of the test (it varies, or a real payment occurs).
  Do not use it when the merchant is only a fixture to create a subscription.
- Put the tag on `describe` when there is one. In files without `describe`, put it on every `test(...)`.

## 2) Allure labels

- Set only one label by hand: `feature`. Use `labelSuite(...)` from `utils/helpers/label-suite.ts`.
- Take the `feature` value **only** from `AUTOTEST_ALLURE.feature`. It mirrors the `domain` axis.
- Do not put the product (`LMS`, `API`) into `feature`. The `@lms` / `@api` tags cover the product.
- You do **not need** a separate Allure tag dictionary. The allure-playwright package copies every Playwright
  tag into an Allure tag and removes the leading `@`. Manual Allure tags create duplicates
  such as `payments` + `Payments`. These duplicates break filtering in the report.

## 3) Forbidden

- Do not put raw strings directly into `tag: [...]`, `allure.feature(...)`, `allure.tags(...)`.
- Do not call `allure.tags(...)` for anything that Playwright tags already cover.
- Do not create per-file label dictionaries.
- Do not import `allure` from `allure-playwright`. That API is deprecated.
  Use `import * as allure from 'allure-js-commons'`.
