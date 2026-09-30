---
description: LMS and Admin Panel auth — authenticate() API session, UI login only when the login screen is under test
globs: tests/**/*.ts,tests/**/*.spec.ts,page-objects/lms/lms-login-page.ts,page-objects/admin/admin-login-page.ts,utils/helpers/lms-auth-session-helper.ts
alwaysApply: false
paths:
  - "tests/**/*.ts"
  - "tests/**/*.spec.ts"
  - "page-objects/lms/lms-login-page.ts"
  - "page-objects/admin/admin-login-page.ts"
  - "utils/helpers/lms-auth-session-helper.ts"
---

# Auth and sessions

Do not log in through the UI. The only exception: the test checks the login screen itself.

## Two methods — do not confuse them

| Method | What it does | When |
|---|---|---|
| `lmsLoginPage.authenticate(user)` | Opens an API session through `LmsAuthSessionHelper`. Closes the post-login modals. Returns `HomePage`. | Every LMS spec |
| `adminLoginPage.authenticate(user)` | Does the same through `AdminAuthSessionHelper` | Every Admin Panel spec |
| `lmsLoginPage.login(email, password)` | A real UI login. It fills the form, clicks submit and waits for the redirect. | Only when the login screen is under test |

Never call `LmsAuthSessionHelper` or `AdminAuthSessionHelper` directly from a spec or helper.
`authenticate()` wraps them. It also handles the post-login modals. The raw helper does not handle them.

**There is no `storageState` in this project.**

- `playwright.config.ts` has no `setup` project.
- There is no `tests/auth.setup.ts`.
- Nothing generates `.auth/*.json` files.

Never write `test.use({ storageState: ... })`. The test will fail.

## Which pattern to use when

| Scenario | Pattern |
|----------|---------|
| LMS course flow with a fixed package and access | A domain fixture with auto `setupLogin` (`coursesTest`, `tradingBasicsTest`, `miniCoursesTest`, `optionsTest`). It calls `lmsLoginPage.authenticate(testUser)` for you. |
| A fresh student per test | `testUserRegistry.createStudent(adminApi)` → `createNewUserWithResolvedPassword` → `lmsLoginPage.authenticate(testUser)` |
| Named persona from JSON (expensive read-only setup) | `userManager.getLmsUser(key)` → `lmsLoginPage.authenticate(student)`. See `test-user-lifecycle.md`. |
| Admin Panel | `baseAdminPanelTest` + `test.use({ adminUserKey })` → `adminLoginPage.authenticate(adminUser)` in `beforeEach` |
| Switching users in the middle of a test | `lmsLoginPage.authenticate(otherUser)` |
| Testing the **login screen** itself (fields, errors, redirect) | `lmsLoginPage.open()` + `lmsLoginPage.login()`. This is the **only** place where a UI login is allowed. |

## ✅ Right — the fixture does the login

```ts
const test = coursesTest.extend({ courseConfig: { /* ... */ } });

test('...', async ({ testUser, lmsHomePage }) => {
  // setupLogin already ran: assignCourseAccess → lmsLoginPage.authenticate(testUser)
  await lmsHomePage.shouldSeePage();
});
```

## ✅ Right — dynamic user

```ts
test('with a new student', async ({ adminApi, lmsLoginPage, lmsHomePage }) => {
  const testUser = await testUserRegistry.createStudent(adminApi);
  await lmsLoginPage.authenticate(testUser);
  await lmsHomePage.shouldSeePage();
});
```

## ✅ Right — Admin Panel

```ts
test.use({ adminUserKey: 'user_TC_191' });

test.beforeEach(async ({ adminLoginPage, adminUser }) => {
  await adminLoginPage.authenticate(adminUser);
});
```

## ✅ Right — testing the login page

```ts
test('error on wrong password', async ({ lmsLoginPage }) => {
  await lmsLoginPage.open();
  await lmsLoginPage.login('user@test.com', 'wrong');
  await lmsLoginPage.shouldSeeInvalidCredentialsError();
});
```

## ❌ Wrong

```ts
test.use({ storageState: '.auth/student.json' });        // does not exist in this project
await LmsAuthSessionHelper.authenticate(page, user);      // call authenticate() on the page object
await lmsLoginPage.login(testUser.email, testUser.password); // UI login outside a login-screen test
```
