---
description: Ban waitForTimeout, networkidle, BasePage.wait — use smart waits
globs: page-objects/**/*.ts,tests/**/*.ts
alwaysApply: false
paths:
  - "page-objects/**/*.ts"
  - "tests/**/*.ts"
---

# No hardcoded waits

## Forbidden

| Anti-pattern | Why |
|-------------|--------|
| `page.waitForTimeout(ms)` | Flaky, wastes run time |
| `this.wait()` / `BasePage.wait()` | Deprecated. Unpredictable pause. |
| `waitUntil: 'networkidle'` | Unreliable on SPAs, slow in CI |
| A fixed sleep inside a helper | Same problem as waitForTimeout |

## What to use instead

| Before | After |
|------|--------|
| `reload({ waitUntil: 'networkidle' })` | `reload({ waitUntil: 'domcontentloaded' })` + `await locator.waitFor()` or `shouldSeePage()` |
| `waitForTimeout(2000)` before a click | `await button.waitFor({ state: 'visible' })` or `expect(button).toBeVisible({ timeout: 15_000 })` |
| `this.wait(3000)` | `await this.shouldSeeX()` / `expect(...).toPass({ timeout })` |
| Waiting for an element to disappear | `expect(locator).toBeHidden()` / `shouldNotSee*` in the POM |
| Waiting for an ISO timestamp | `DateHelper.waitUntilIsoHasPassed(iso, { maxWaitMs: 60_000 })`. It fails with a clear message on timeout. |
| Polling complex UI | `expect(async () => { ... }).toPass({ timeout: DateHelper.secondsToMs(30) })` in the POM, not in the spec |

## Timeouts in milliseconds

**Never** write bare literals: `30_000`, `timeout: 15_000`, `test.setTimeout(120_000)`.

**Use** `DateHelper`:

```ts
// ❌
await expect(button).toBeVisible({ timeout: 30_000 });
await expect(async () => { ... }).toPass({ timeout: 90_000 });
test.setTimeout(180_000);

// ✅
await expect(button).toBeVisible({ timeout: DateHelper.secondsToMs(30) });
await expect(async () => { ... }).toPass({ timeout: DateHelper.secondsToMs(30) });
test.setTimeout(DateHelper.minutesToMs(3));
```

For minutes, use `DateHelper.minutesToMs(1)`. Import `DateHelper` from `@/utils/helpers/date-helper`.

## POM

```ts
// ❌
await this.page.waitForTimeout(5000);

// ✅
await expect(this.submitButton).toBeVisible({ timeout: DateHelper.secondsToMs(15) });
```

```ts
// ❌
await this.page.reload({ waitUntil: 'networkidle' });

// ✅ networkidle replaced: domcontentloaded plus a page anchor
await this.page.reload({ waitUntil: 'domcontentloaded' });
await this.shouldSeePage();
```

## Specs

- Do not add `setTimeout` or `waitForTimeout`.
- For long scenarios, use `test.setTimeout(DateHelper.minutesToMs(2))`. Add a comment that explains **why** (Stripe, certificate generation, calendar expiry).
- In `DateHelper.secondsToMs(n)`, **n must not exceed 30** unless the user explicitly allowed it (`date-helper-seconds-to-ms.md`). For longer timeouts, use `minutesToMs`.

## BasePage.wait

- `BasePage.wait` has the `@deprecated` tag. New code must not call it.
- When you refactor code, replace `BasePage.wait` with a concrete wait for an element or a state.
