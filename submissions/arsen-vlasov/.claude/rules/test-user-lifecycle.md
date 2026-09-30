---
description: Dynamic vs static test users — when to use createStudent, when UserManager, and cleanup
globs: tests/**/*.spec.ts,tests/**/*.test.ts,fixtures/**/*.ts,test-data/users/**
alwaysApply: false
paths:
  - "tests/**/*.spec.ts"
  - "tests/**/*.test.ts"
  - "fixtures/**/*.ts"
  - "test-data/users/**"
---

# Test user lifecycle

Before you write a spec from a test case, you **must** decide: dynamic user or static user. A static user lets you avoid an expensive setup on every run.

## Static vs dynamic

The default is **dynamic** (`testUserRegistry.createStudent()`). Static is the exception. It is justified when it saves real time and does not break isolation.

| Static (`UserManager`) | Dynamic (`createStudent`) |
|------------------------|---------------------------|
| Expensive precondition: completing a course or blocks, a certificate, paid products, historical calendar data, a unique email or phone that **must already exist** | Cheap setup over the API: create plus `grantCourseAccess` / `grantSubscription` |
| The scenario is **read-only** with respect to the user (display, filters, duplicate email or phone) | The scenario **mutates** the user: a purchase, profile change, lesson completion, subscription, cashback spend |
| Several tests or test cases need the same persona | A clean new student is required |
| The API cannot reproduce the state quickly | Isolation between Playwright workers is required |

**Hybrid:** keep the expensive baseline static. Just before the steps, use the API to prepare the data that the test changes (cashback, flags). Do not run `CourseProgressHelper.markCourseCompletedForUser` in every test if the user already completed the course.

**A static user is not allowed** when more than one worker would write to the same user concurrently.

Before you write code, tell the user your decision in one or two sentences. Examples:

- *"precondition X is slow and read-only → static `student_completed_trading_basics`"*
- *"the test buys a product → dynamic"*

### Creating a static user that does not exist yet

1. Search for an existing key in `test-data/users/static/{dev,stage}.json` (`lms` / `admin`). Reuse a persona instead of creating more `student_TC_*` keys.
2. If no key is suitable, **create one**:
   - The key is **semantic** and has no TC ID: `student_completed_trading_basics`, `admin_without_customers_access`. Do not rename legacy keys such as `student_TC_193`.
   - Put the key and the account into `stage.json` **only**. Do not do these two things unless the user explicitly asks:
     - add them to `dev.json` or `prod.json`
     - provision the account on dev
   - In an Admin Panel spec, the key is a **literal string from `stage.json`**. Do not make an `export const` alias (see `admin-panel-user-keys.md`).
   - In an LMS spec: `userManager.getLmsUser(key)` / `getAdminUser(key)` / `test.use({ adminUserKey })`. Never hardcode an email or password.
   - Some LMS users are search targets in the Admin Panel. For such a user, add a unique suffix to the email **before the `@`**. Otherwise, the search also matches other accounts (see `admin-panel-student-emails.md`).
   - Create the user on the **current ENV** (never prod) through the existing Admin API: `createNewUserWithResolvedPassword`, access grants, progress. The reference pattern for "already exists" is `ensureStaticDuplicateRegisterUser`.
   - If the API cannot reproduce the state (a manual payment, waiting days until expiry):
     - Add the JSON entry plus a checklist for the user.
     - Do not hide the problem with an empty account.
3. `TestUserRegistry` does **not** track static users. Static users **never** get cleanup or access revocation.
4. After you create a static user, tell the user these facts:
   - the key
   - the email
   - that the account exists on **stage** (`stage.json`)

Reference specs: `lms-register.spec.ts` (duplicate email), `student-card-display.spec.ts` and students-list (stable row), `student-create.spec.ts` (`adminUserKey`).

## Creating a dynamic user

- In specs, use **`testUserRegistry.createStudent()`**. Never call `UserFactory.createStudent()` directly.
- `UserFactory` is the internal data factory. Specs and helpers get their user through the registry.
- Create the user **inside** `test()` or a `test.step`. Never create it at `for` or `describe` declaration time.

```ts
// ❌ one user shared across all iterations of a parametrized test
for (const pkg of packages) {
  const testUser = UserFactory.createStudent();
  test(`... ${pkg}`, async () => { ... });
}

// ✅
for (const pkg of packages) {
  test(`... ${pkg}`, async () => {
    const testUser = testUserRegistry.createStudent();
    ...
  });
}
```

## Cleanup (mandatory for dynamic users)

```ts
test.afterEach(async ({ adminApi, courseSetupHelper }) => {
  await testUserRegistry.cleanup({ adminApi, courseSetupHelper });
});
```

The registry **does not delete** accounts, because there is no such endpoint. It only revokes course access (`revokeAccessPackageByCycleId` / `revokeAccessPackage`).

The registry does **not** track static users. It **never** revokes their access.

## The `userCreationFixture` fixture

- Creates `testUser` for suites that use an auto-fixture.
- **Teardown**: `testUserRegistry.cleanup()` after `use()`. It only revokes access.

## AdminUserApi

- In specs, call `createNewUserWithResolvedPassword` only through `TestUserRegistry.createStudent()`.
- To provision a static user once (not inside every test), use the same API without tracking or cleanup.
- `revokeAccessPackage` / `revokeAccessPackageByCycleId` are for registry cleanup. Never use them for static users.

## ❌ Wrong

```ts
const testUser = UserFactory.createStudent();
test('...', async ({ adminApi }) => {
  await adminApi.createNewUserWithResolvedPassword(testUser);
  // no afterEach cleanup
});
```

## ✅ Right — dynamic

```ts
test.afterEach(async ({ adminApi, courseSetupHelper }) => {
  await testUserRegistry.cleanup({ adminApi, courseSetupHelper });
});

test('...', async ({ adminApi, lmsLoginPage, lmsHomePage }) => {
  const testUser = await testUserRegistry.createStudent(adminApi);
  await lmsLoginPage.authenticate(testUser);
  await lmsHomePage.shouldSeePage();
});
```

## ✅ Right — static (expensive read-only setup)

```ts
test('...', async ({ userManager, lmsLoginPage, lmsHomePage }) => {
  const student = userManager.getLmsUser(COMPLETED_COURSE_STUDENT_KEY);
  await lmsLoginPage.authenticate(student);
  await lmsHomePage.shouldSeePage();
});
```

## Passwords

- Never hardcode passwords in specs or POM.
- Static user: the password is in `test-data/users/static/{env}.json`, next to the existing keys. `UserManager` reads it.
- Do not create an env variable per user.
