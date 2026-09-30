---
description: Code quality anti-patterns and clean code
globs: "**/*.{ts,tsx,js,jsx}"
alwaysApply: false
paths:
  - "**/*.{ts,tsx,js,jsx}"
---

# Code Quality — anti-patterns and clean code

## Project anti-patterns (forbidden)

| Anti-pattern | Correct |
|-------------|-----------|
| `lmsLoginPage.open()` + `login()` in regression specs | `lmsLoginPage.authenticate(user)`, or a fixture with auto `setupLogin` |
| `UserFactory.createStudent()` in specs | `testUserRegistry.createStudent()` + cleanup, **or** a justified static user: `userManager.getLmsUser(key)` (`test-user-lifecycle.md`) |
| `UserFactory.createStudent()` inside a `for` loop at test declaration time | Create it **inside** `test()` |
| `expect()` in `tests/specs/**` | `should*` methods in POM and helpers |
| `new CourseApiClient()` or raw API calls in `test()` | A fixture, `CourseProgressHelper`, or a domain helper |
| `waitForTimeout` / `this.wait()` in POM | A locator plus `toBeVisible` or `toPass` |
| `networkidle` on reload or navigate | `domcontentloaded` plus an explicit wait for an anchor element |
| `any` in production code (`core/`, `page-objects/`, `utils/`) | Generics `<T = unknown>` or concrete interfaces |
| Passwords in JSON or in the repository | `.env` + `UserManager`, template in `.env.example` |
| Imports from `utils/api/types/` | One tree: `utils/types/api/` |
| God file over ~300 lines | Split into components or domain specs |

## General anti-patterns

### God Object
One class does everything. Split it into services, components and helpers.

### Hardcoded Values
Replace magic numbers and strings with constants, enums or `DateHelper` calls.

### Copy-Paste
Put shared logic into helpers (`tests/helpers/`, `utils/helpers/`).

### Overengineering
Keep the code simple. Do not build extra layers for a single call site.

### Lava Flow
Delete dead code.

## Clean code

- Use clear names.
- Give each function one responsibility.
- Keep functions short (roughly 5-60 lines of logic).
- In tests, apply DRY, KISS, YAGNI and SOLID with judgement, not as dogma.

## Playwright config (reference)

- `globalTeardown`: `./config/global-teardown.ts`
- `timeout`: `60_000`. Long scenarios (Stripe, certificate generation, `waitUntilIsoHasPassed`) use `test.setTimeout(120_000)` with a comment.
- `video`: `process.env.CI ? 'retain-on-failure' : 'off'`
- `screenshot`: `'only-on-failure'`
- `trace`: `process.env.CI ? 'on-first-retry' : 'retain-on-failure'`

## Secrets and env

- Variable types: `environment.d.ts`
- Loading: `config/.env` (see `playwright.config.ts`)
- Passwords come only from env. `UserManager` injects them at startup.
