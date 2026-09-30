# ui-autotest: auth patterns and fixtures

Part of the `ui-autotest` skill. Read it when [SKILL.md](../SKILL.md) points here.

## 7. Auth — the way this project does it (not inline in the spec without reason)

Do **not** write the login into every `test.step`. Auth lives in a fixture or a domain helper. The spec either starts from an authenticated state or calls the helper in its `Precondition`.

### Pattern 1 — domain fixture with auto `setupLogin` (style B, courses)

**The main pattern** for LMS courses: one connected flow with a fixed package and access.

```ts
import { coursesTest } from '@/tests/specs/regression/lms/courses-signup-admin-panel';
// or tradingBasicsTest, miniCoursesTest, optionsTest

const test = coursesTest.extend({
  courseConfig: {
    cycleId: CYCLES.TRADING_BASICS_V2.id,
    productConfig: { productName: Courses.TRADING_BASICS, packageName: Package.Basic },
  },
});

test('...', async ({ testUser, lmsHomePage, courseProgramPage }) => {
  // setupLogin has already done: createStudent → assignCourseAccess → lmsLoginPage.login
  await lmsHomePage.clickAvailableProductCardButton(...);
});
```

The chain: `userCreationFixture.testUser` → `courseSetupHelper.assignCourseAccess` → `lmsLoginPage.open()` and `login()` inside the **`setupLogin` fixture** (`courses-signup-admin-panel.ts`, `mini-courses-test.ts`, `options-test.ts`).

To override the package, use `test.use({ tradingBasicsPackageName: Package.Extended })` together with `tradingBasicsTest`.

### Pattern 2 — `TestUserRegistry` plus a helper (style A, different personas)

Use this pattern when every `test()` needs its own persona and precondition:

```ts
import { coursesTest as test } from '@/tests/specs/regression/lms/courses-test';

const testUserRegistry = new TestUserRegistry();

// in the test precondition or in a helper:
const testUser = await testUserRegistry.createStudent(adminApi);
await testUserRegistry.grantCourseAccess(courseSetupHelper, { email, accessId, cycleId });
await lmsLoginPage.authenticate(testUser);
await lmsHomePage.shouldSeePage();
```

Extract this code into a domain helper (`investment-and-capital-flows.ts`: `createStudentAndLogin`, `assignCourseAccessAndLogin`) or into a local function in the file. **Never copy the login block into every test**.

### Pattern 3 — Admin Panel

Every `tests/specs/regression/admin-panel/**/*.spec.ts` gets a **new** manager (its own `adminUserKey`). Never use `example_user` / `autotest_runner`. Never use the `user_TC_*` of another spec. To create a manager, read `admin-panel-create-admin-user.md`. To connect the key to the spec, read `admin-panel-dedicated-admin-user.md`.

`baseAdminPanelTest` + `test.use({ adminUserKey })` + a `beforeEach` with `adminLoginPage.authenticate(adminUser)`. For an example, see `student-create.spec.ts`.

### Pattern 4 — static LMS user (expensive precondition)

If step 5 of §0 selected a static user, do these steps:

1. Take the key from JSON.
2. Call `userManager.getLmsUser(key)`.
3. Call `lmsLoginPage.authenticate(student)`.

Do not call `createStudent` or `markCourseCompletedForUser` on every run. To create the key, read `test-user-lifecycle.md`.

```ts
test('...', async ({ userManager, lmsLoginPage, lmsHomePage }) => {
  const student = userManager.getLmsUser(COMPLETED_COURSE_STUDENT_KEY);
  await lmsLoginPage.authenticate(student);
  await lmsHomePage.shouldSeePage();
});
```

### What to avoid

- Duplicating `lmsLoginPage.open()` + `login()` in every style B `test()` when a fixture with `setupLogin` fits.
- Writing `expect` or login assertions in the spec. Use only `should*` POM calls after the helper or fixture.
- Creating a new student on every run for a long read-only setup. Consider a static user first (`test-user-lifecycle.md`).
- For details and edge cases, read `auth-and-sessions.md` (`authenticate()` versus the UI `login()`). Regression currently uses mostly patterns 1-2. So do not treat Pro Trading as the only auth reference.


## 8. Fixtures

| `test` | When | Auth |
|--------|-------|------|
| `coursesTest` from `courses-signup-admin-panel.ts` | TO 2.0 courses, connected flow | auto `setupLogin` + `testUser` |
| `tradingBasicsTest` | TO 2.0 with package selection | extends signup-admin-panel |
| `miniCoursesTest` | Mini-courses | auto `setupLogin` |
| `optionsTest` | Options | auto `setupLogin` + access assignment |
| `coursesTest` from `courses-test.ts` | Shop, investment style A, demo, custom preconditions | manual, in a helper or precondition |
| `coursesTestSignupForm` | Landing signup | its own `setupLogin` |
| `baseAdminPanelTest` | Admin Panel | admin login in `beforeEach` |

Page fixtures: `fixtures/pages/regression-*.fixture.ts`. API fixtures: `fixtures/api-helpers.fixture.ts` (`adminApi`, `courseSetupHelper`, `createLmsContext`).
