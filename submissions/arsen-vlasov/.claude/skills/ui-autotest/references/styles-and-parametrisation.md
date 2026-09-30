# ui-autotest: styles A and B, parametrisation

Part of the `ui-autotest` skill. Read it when [SKILL.md](../SKILL.md) points here.

## 1. Two styles of "TC → autotest"

### Style A — "TC canvas" (one step = one independent scenario)

Every step of the test case becomes a separate check with **its own** precondition (different personas, different states).

**Reference specs:**
- `tests/specs/regression/lms/courses/investment-and-capital/block-availability.spec.ts` (PRJ-TC-*, 9 `test()` blocks)
- `tests/specs/regression/admin-panel/students/student-create.spec.ts` (PRJ-TC-191, 6 `test()` blocks)
- `tests/specs/regression/lms/subscriptions-and-payments/pro-trading-student-page.spec.ts` (PRJ-TC-218, 14 `test()` blocks — style A, Pro Trading domain, see `pro-trading-autotests.md`)

**File structure:**
- One `test.describe` per test case or feature.
- `linkTestCase(id)` goes in **every** `test()` or in `test.beforeEach`, **not** in `test.beforeAll`. The reason: Allure attaches the link only to the first test that the worker runs after the hook. PRJ-TC-69 showed this: tests 2 and 3 had no link.
- Each TC step becomes `test(\`N. ...\`)` — the title carries the step number.
- Inside `test()`, put `test.step('Precondition: ...')` first. Then put the action steps and the check steps.
- A repeated flow (create user + grant access + log in) goes into a **local function or domain helper**. Put it at the top of the file or in `helpers/`. Never copy-paste it between tests. Example: `createStudentAndLogin`, `assignCourseAccessAndLogin` in `investment-and-capital/helpers/investment-and-capital-flows.ts`.
- For LMS, add `test.afterEach` with `testUserRegistry.cleanup({ adminApi, courseSetupHelper })` for the whole file.
- For Admin Panel, follow the `student-create.spec.ts` pattern.

### Style B — "ordinary TC" (one connected scenario)

The steps run in sequence. Each step depends on the state that the previous steps left.

**Reference specs:**
- `tests/specs/regression/lms/courses/trading-basics/questionnaire-before-course.spec.ts` (PRJ-TC-72, one `test()`, auth through a fixture)
- `tests/specs/regression/lms/shop/shop-buy-all-products.spec.ts` (PRJ-TC-190, one `test()`)
- `tests/specs/regression/lms/courses/trading-basics/delete-previous-role-during-upgrade.spec.ts` (PRJ-TC-208, parametrisation plus fixture)

**Structure:**
- One `test()` per test case (or one `test()` per parametrised variant).
- `linkTestCase(id)` once at the start of `test()`.
- Each TC step number becomes a `test.step('N. ...')`, in the order given by the test case.

### How to choose the style

1. If the user stated it explicitly ("canvas" / "one scenario"), follow that without asking.
2. **When the TC owner is Katya** (`Катя` in AIO and Jira), do not use style A's "one step = one `test()`". Combine the steps into a few autotests (or one), even when the test case has 15-20 steps. The goal is 3-5 tests that cover batches of steps, not 20 single-step tests. Make a separate `test()` only in these cases:
   - Some steps need a different user or role.
   - You cannot continue without a separate precondition.

   Steps with Telegram and other external systems become `test.fixme`, with the step numbers in the title. Reference specs: `pro-trading-block-unblock.spec.ts`, `pro-trading-deactivate-subscription.spec.ts`.
3. Otherwise, use these rules:
   - **10+ steps** with different preconditions or personas → **A**.
   - **3-10 connected steps** of one flow → **B**.
4. When the choice is genuinely ambiguous, ask **one** clarifying question. Do not guess silently.


## 2. Parametrisation (do not invent a new way)

| Pattern | When | Reference |
|---------|-------|--------|
| Module-level `for` producing separate `test()` blocks | Same scenario, different data | `v2-card-visibility.spec.ts` |
| `test.extend({ courseConfig: ... })` inside a loop | Scenarios differ by fixture config | `delete-previous-role-during-upgrade.spec.ts` |
| Parametrising **a single step** in style A | The remaining steps stay ordinary `test()` blocks | `pro-trading-advanced-tariffs-block.spec.ts`, step 2 |
| `for` **inside** a `test.step` | Iterating over data within one scenario | `shop-buy-all-products.spec.ts` |
| `test.use({ tradingBasicsPackageName: Package.Extended })` | Overriding the package for the whole file | `recommendations-header-and-structure.spec.ts` |

**Hard rule** (`test-user-lifecycle.md`): call `testUserRegistry.createStudent()` **inside** the body of a `test()`, or inside the iteration that produces a `test()`. Never call it in a `for` loop above the test declarations without a `test()` wrapper.

Exception: the `testUser` fixture from `userCreationFixture` creates the user at fixture level (see `fixtures/user-creation.fixture.ts`). Specs use this fixture together with the auto `setupLogin`. With this fixture, do not also call `createStudent` in the spec.
