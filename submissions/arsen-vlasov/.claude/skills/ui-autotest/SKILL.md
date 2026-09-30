---
name: ui-autotest
description: >-
  Procedure to turn a test case (TC) into a Playwright regression autotest.
  It covers the choice between style A and B, parametrisation, auth patterns and the fixture choice.
  It also gives the spec skeleton, a self-check list and the proof that the test can fail.
  Use it when asked to write an autotest from a test case or from a Jira AIO TCMS link or number.
  Also use it when the source is test case text pasted into the chat.
---

# Autotests from test cases (TC)

This skill is the protocol to generate UI autotests from a Jira test case. Other sources also apply, and this skill does not repeat them:

- `project-base.md` always applies.
- `code-quality.md` loads with the `.ts` files.
- The skill `karpathy-guidelines` covers behaviour.

## 0. Before writing any code

1. Read the test case text (§5). Identify the owner and the style: A, B or "Katya" (§1).
2. Check the generation scope with the user (§4). Skip this step when the request states the scope explicitly.
3. Look for existing `should*` / `click*` methods in `page-objects/**` and in domain `helpers/`. Do not create duplicates.
4. Pick the `test` fixture and the auth pattern (§7-§8).
5. **Static vs dynamic user.** Examine the precondition with the rules in `test-user-lifecycle.md` (§ Static vs dynamic). Use a static user when both conditions are true:
   - The setup is slow (completing a course, a certificate, paid products, a unique email or phone).
   - The test does not mutate the user.

   In that case, create or reuse a static user. Do **not** build that user again on every run. Before you write code, tell the user the decision in one or two sentences.
6. **You create the dedicated Admin Panel users. Do not ask.** A new `tests/specs/regression/admin-panel/**` file gets its own `user_TC_<n>_admin`. It also gets `user_TC_<n>_mentor…` when the TC needs mentors that no other spec touches. Do these steps:
   1. Create the users through `AdminUserApiClient.createManager`, as `admin-panel-create-admin-user.md` tells.
   2. Write the keys into `stage.json` → `admin` from a one-off provisioning spec. Never print the passwords. Never commit that spec.
   3. Add the rows to `admin-panel-dedicated-admin-user.md`.

   The permission prompt for `stage.json` is the only human step.
7. Read the relevant domain rules (§9).
8. Before you write code, choose the Playwright tags and the Allure `feature` from the dictionary (§3.1, `autotest-tags-and-allure.md`).
9. If the test case is about an **API endpoint**, follow all of `api-test.md`. In that case, this skill adds only §4-§6 (scope, blockers, input formats, Jira read-only).

## 1. Two styles of "TC → autotest"

Read [references/styles-and-parametrisation.md](references/styles-and-parametrisation.md). It gives style A (one step = one scenario), style B (one connected scenario), how to choose the style, and the reference specs.

## 2. Parametrisation (do not invent a new way)

Read [references/styles-and-parametrisation.md](references/styles-and-parametrisation.md). It gives the parametrisation patterns that the repository already uses.

## 3. Mandatory conventions (references)

| Topic | Rule |
|------|------|
| No TC IDs in names | `test-naming-no-tc-ids.md` — the ID belongs only in `linkTestCase(id)` |
| No `expect` in specs | `playwright-specs-no-expect.md` |
| POM | `page-objects-conventions.md`, `page-object-size.md` |
| Users and cleanup | `test-user-lifecycle.md` — decide static vs dynamic first. Do not call `createStudent` for a long setup. |
| Timeouts | `no-hardcoded-waits.md` — `DateHelper`, smart waits |
| Tags / Allure feature | `autotest-tags-and-allure.md` — values only from `utils/constants/autotest-labels.ts` |

### 3.1. Playwright tags and the Allure `feature` (required in every new spec)

Two layers:

| Layer | Purpose | How |
|------|-------|-----|
| Playwright `tag` | `--grep` and Jenkins filtering | `test.describe(..., { tag: [...] }, ...)` or `test(..., { tag: [...] }, ...)` |
| Allure `feature` | Navigation in the report | `await labelSuite({ feature: AUTOTEST_ALLURE.feature.* })` |

The rules in short. For details, read `docs/design/autotest-tags-and-allure.md` and `autotest-tags-and-allure.md`.

- Values come **only** from `AUTOTEST_PLAYWRIGHT_TAGS` and `AUTOTEST_ALLURE.feature`.
- Axes: product (`@lms` / `@admin-panel` / `@api`) + `domain` + `capability` + `integration` when it is relevant.
- A tag never duplicates the folder path.
- Use two `domain` tags only for a scenario that is genuinely cross-domain.
- Use `integration.X` when the merchant is the subject of the test, not when it is a subscription fixture.
- `labelSuite` sets **only** `feature`, and `feature` mirrors `domain`. The Allure tags come from the Playwright tags automatically. Never call `allure.tags(...)`.
- Put the tag on `describe` when the spec has one. Otherwise, put the tag on every `test(...)`.
- Call `labelSuite` in `beforeEach` (style A) or at the start of `test()` (style B without a describe).

## 4. Controlling how much gets generated

Parse the scope from the request. Examples: "the first 3", "half", "everything", "up to step 7".

### Style A

- Write exactly N complete `test()` blocks with preconditions, steps and cleanup. Start from the first step that no test covers yet.
- Write **no stubs** for the remaining steps.
- At the end of the file, add `// TODO: TC steps N..M are not implemented yet`.
- "Half" means `floor(total_steps / 2)`. Tell the user the resulting number of tests.

### Style B

- Write only the requested `test.step` calls, in test case order.
- Add `// TODO: steps N..M not implemented in this pass`.

### What to do when a POM method or helper is missing

If the user did **not** specify the mode, ask which mode to use:

| Mode | Behaviour |
|-------|-----------|
| **"Create new methods"** | Add `should*` / `click*` / `fill*` to the POM or component |
| **"Comment out blockers"** | Write `// TODO: blocker — no <name> method in <PageObject/helper>`. Then **stop**. |

## 5. Test case input formats

1. **TC text** pasted into the chat.
2. **A key** — `PRJ-TC-217`. A bare number is ambiguous: ask whether it is the key.
3. **An AIO link** — `…aio-tcms-app-browse…` or `…/jira/apps/…?ac.page=case-steps…`, with `ac.params={"caseId":<N>}`.

**`caseId` in a link is AIO's internal record id, not the number in the key.** The mapping is arbitrary. For example, `caseId=130` is `PRJ-TC-84`, and `PRJ-TC-130` is an unrelated shop case. Never call `get_test_case` with `PRJ-TC-<caseId>`. Never put `caseId` into the first argument of `linkTestCase`. The AIO MCP also cannot find a case by `caseId`.

Resolve a link to its key in this order:

1. **The person gave the key or the title next to the link** → use it. If the person gave only the title, search by title with `search_test_cases` (`title` CONTAINS).
2. **Claude in Chrome is connected** → do these steps:
   1. Open the link in a new tab.
   2. Take a screenshot.
   3. Read the key from the header (`PRJ-TC-84: <title>`).
   4. Close the tab.

   The case is in a cross-origin iframe. Page text and the accessibility tree do not show the case, but the screenshot does. Do not touch anything on the page. This includes cookie banners.
3. **Otherwise** → ask: "Which key is this link — `PRJ-TC-…`? It is at the top of the case."

Then read the case and its context. All of these actions are read-only:

1. `mcp__aio-tests__get_test_case` with the key → steps, expected results, precondition, folder, `requirements` (numeric Jira issue ids).
2. For each requirement id → Jira `getJiraIssue` → the story's description and acceptance criteria, and `issuelinks` for related bugs. If the test case and the story disagree, the test case decides what the autotest checks. Name the difference in your plan.
3. Attachments: request the `attachment` field. You can read the list (names, types). You may not be able to read the content of images and PDFs. If a step depends on an attachment, say so and ask for it.

If a call fails or returns nothing usable, say exactly that. Then ask for the text. Do not guess the test case from its title.

`linkTestCase(<key number>, <caseId>)` takes its arguments in this order:

- First: the number from the **key**.
- Second: the `caseId` from the link, when you have the link.

Example: `linkTestCase(84, 130)` for `PRJ-TC-84`. With the second argument, the Allure link opens the case itself. Without it, the Allure link opens the project's case list.

**Never invent steps.** A spec from an imagined test case looks right and passes review. But it tests nothing that the person asked for. An honest "I cannot read PRJ-TC-217, paste the text" costs one message. A fabricated spec costs a release.

## 6. Jira is read-only

Changing a test case in Jira is **forbidden**. This rule applies to every path to Jira: a connector, a browser or anything else. You can read the test case. You can refer to it with `linkTestCase(id)` in code. If the case looks like it needs a change, say so. Let the person make the change.

## 7. Auth — the way this project does it

Read [references/auth-and-fixtures.md](references/auth-and-fixtures.md). It gives the four auth patterns (domain fixture, `TestUserRegistry` + helper, Admin Panel, static LMS user) and what to avoid.

## 8. Fixtures

Read [references/auth-and-fixtures.md](references/auth-and-fixtures.md). It tells which `test` fixture to import for each domain.

## 9. Domain rules

| Domain | Rule |
|-------|------|
| Pro Trading | `pro-trading-autotests.md`, `pro-trading-subscriptions-api.md` |
| Activity Calendar | `activity-calendar-conventions.md` |
| Admin Panel tables | `admin-panel-tables.md` |
| Admin Panel: one user per file | `admin-panel-dedicated-admin-user.md` |
| Admin Panel: creating a manager | `admin-panel-create-admin-user.md` |
| Admin Panel: keys without aliases | `admin-panel-user-keys.md` |
| API endpoint | `api-test.md` |

## 10. Spec file skeleton

Read [references/spec-skeleton.md](references/spec-skeleton.md). It gives the skeletons for style A and style B.

## 11. Self-check before showing the result to the user

- [ ] No `expect(...)` in `.spec.ts`
- [ ] `linkTestCase(<n>)` in every `test()` or in `test.beforeEach`, never in `test.beforeAll`. Add `<caseId>` as the second argument when you have the AIO link (§5)
- [ ] File name, `test()` and `describe` titles carry no TC ID
- [ ] Playwright `tag` from `AUTOTEST_PLAYWRIGHT_TAGS` plus `labelSuite({ feature })` from the dictionary
- [ ] `createStudent()` called inside `test()` (or `testUser` taken from the fixture, not both) **when** the user is dynamic
- [ ] Static vs dynamic decided: slow read-only setup → `UserManager` plus a key in `test-data/users/static/*.json`, with no cleanup for that user
- [ ] Admin Panel spec has its own manager per file. A new manager follows `admin-panel-create-admin-user.md`
- [ ] Admin Panel key taken from `stage.json` as a literal string, no alias (`admin-panel-user-keys.md`)
- [ ] `test.afterEach` with cleanup wherever the spec uses `TestUserRegistry` (never for static users)
- [ ] No `waitForTimeout`, `networkidle`, or bare millisecond literals
- [ ] Auth lives in a fixture or helper, not spread across the spec steps without reason
- [ ] New POM methods follow the conventions, and the file stays under ~300 lines
- [ ] Blockers marked with `// TODO`, never an invented implementation
- [ ] For Katya's test cases, the spec groups the steps into several `test()` blocks, not one test per step
- [ ] You did not change the Jira test case

## 12. Prove it before calling it done

A spec is done when all five items are true. Report each item with its real output.

1. **`npm run check`** is green.
2. **One green run on stage:** `ENV=stage HEADLESS=true npx playwright test <spec>`.
3. **One red run on purpose (mutation).** Do these steps:
   1. Change one expected value that the test checks. Use the argument of a `should*` call in the spec (expected text, count, status). Or use a literal in the POM assertion that the test calls.
   2. Run again. The test must fail **on that check**. Copy the failing line.
   3. Revert the change.
   4. Check that `git diff` shows only your new work.
   5. Run green once more.

   If the mutated run stays green, that check tests nothing. Fix the check.
4. **Coverage table** in the reply, with one row per TC step.

| TC step | `test()` / `test.step` | `should*` method that checks it |
|---|---|---|
| 1. … | `1. …` | `CoursePage.shouldSeeLesson` |

A step without a `should*` in its row is either a TODO blocker (§4) or a missed check. Say which.

5. **Independent review.** Give the spec path and the TC key to the `spec-reviewer` subagent. You wrote the code, so your own coverage table is a claim. The subagent's matrix is the check. Fix each CHANGES and REJECT finding, or say why the finding is wrong. Do not silently drop a finding. Put the subagent's verdict line in the reply.

If item 2 (the green run on stage) fails and the cause is not your code, use the `bug-report` skill. Examples of such causes: a product bug, stage down, test data. Do not change the test to make it green.
