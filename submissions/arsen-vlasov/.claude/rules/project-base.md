---
description: Core project principles (short, always applied)
alwaysApply: true
---

# Project Base Rules

- **Readability**: the code must be clear at first glance to someone who did not write the test.
- **DRY/KISS**: put repeated flows in POM, `tests/helpers/`, or domain `helpers/` next to the specs (example: `investment-and-capital-flows.ts`).
- **No magic**: put strings, numbers and timeouts into constants, enums or `DateHelper` (`DateHelper.secondsToMs(30)`, never `30_000`). Passwords come only from `.env` through `UserManager`.
- **Specs are scenarios**: `.spec.ts` contains steps and actions. Assertions are in `should*` methods of POM and helpers (see `playwright-specs-no-expect.md`).
- **POM style**: `click*`, `open*`, `fill*`, `shouldSee*`. Do not use `expect` in specs. Do not use `waitForTimeout` / `this.wait()` in POM.
- **Auth**: do not log in through the UI in regression specs. Use `lmsLoginPage.authenticate(user)` / `adminLoginPage.authenticate(user)`, or a fixture that does it (see `auth-and-sessions.md`).
- **Users**: by default, use `testUserRegistry.createStudent()` plus `afterEach` cleanup. If the precondition is expensive and the scenario does not mutate the user, take a static user through `UserManager` (see `test-user-lifecycle.md`).
- **File size**: god files are forbidden. Keep a POM at around 300 lines. Split large specs by domain (see `page-object-size.md`).
- **Tags / Allure**: every spec has a Playwright `tag` plus `labelSuite({ feature })`. Take the values only from `utils/constants/autotest-labels.ts` (see `autotest-tags-and-allure.md`, `docs/design/autotest-tags-and-allure.md`).
- **Jira is read-only**: never change a test case in Jira. You may read a test case and refer to it through `linkTestCase(id)`.

Step-by-step procedures (write an autotest from a test case, cover an API endpoint) are in skills
under `.claude/skills/`. Skills load when a task requests them, not by file path.

Specialised rules load through `globs` when you work with these areas:

- specs
- POM
- the activity calendar
- API
- Admin Panel tables (`admin-panel-tables.md`, see `docs/design/admin-panel-tables/index.md`)
- one dedicated admin per spec file (`admin-panel-dedicated-admin-user.md`)
- creating a manager (`admin-panel-create-admin-user.md`)
- user keys without aliases (`admin-panel-user-keys.md`)
