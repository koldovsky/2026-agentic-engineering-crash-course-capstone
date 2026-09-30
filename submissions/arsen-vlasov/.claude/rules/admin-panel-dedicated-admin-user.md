---
description: A dedicated admin user per Admin Panel spec. LMS API uses autotest_runner
globs: tests/specs/regression/admin-panel/**/*.ts,test-data/admin/**/*.ts,test-data/users/static/**
alwaysApply: false
paths:
  - "tests/specs/regression/admin-panel/**/*.ts"
  - "test-data/admin/**/*.ts"
  - "test-data/users/static/**"
---

# Admin Panel: one dedicated admin per file

LMS specs call the Admin API as **`example_user` / `autotest_runner@example.com`** (`getAdminUser()` with no key). **Admin Panel** specs must not log in that way.

To create a manager («Администратор» / «Ментор»), see **`admin-panel-create-admin-user.md`**.

## Rule

Every `tests/specs/regression/admin-panel/**/*.spec.ts` gets its own `adminUserKey` from `stage.json` → `admin`. Two files **never share** a key.

```ts
test.use({ adminUserKey: 'user_TC_191' });
// authenticate with this user only:
await adminLoginPage.authenticate(adminUser);
```

- Never put `example_user` / `autotest_runner` into `test.use({ adminUserKey })`.
- Add a second admin to the same file only when the test case checks a different role. Example: `user_TC_194_restricted` in students-list.
- For a new file, do these steps in this order:
  1. Create the manager as `admin-panel-create-admin-user.md` describes.
  2. Add the key to `stage.json`.
  3. Use the key as a literal string in the spec. Do not use an alias (see `admin-panel-user-keys.md`).
- Never use the `user_TC_*` key of another spec.
- This rule does not apply to LMS and API tests. They continue to use `getAdminUser()`.

## ❌ Wrong

```ts
// two spec files, one key — parallel workers log in as the same admin
test.use({ adminUserKey: 'user_TC_192' });
```

## ✅ Right

| spec | key |
|------|------|
| `student-create.spec.ts` | `user_TC_191` |
| `student-profile-edit.spec.ts` | `user_TC_192` |
| `student-card-display.spec.ts` | `user_TC_193` |
| `students-list.spec.ts` | `user_TC_194` (+ `user_TC_194_restricted`) |
| `pro-trading-block-unblock.spec.ts` | `user_TC_181` |
| `pro-trading-subscription-history.spec.ts` | `user_TC_185_admin` (+ `user_TC_185_mentor`) |
| `pro-trading-deactivate-subscription.spec.ts` | `user_TC_186_admin` (+ `user_TC_186_mentor`) |
| `pro-trading-telegram-access.spec.ts` | `user_TC_187_admin` (+ `user_TC_187_mentor`) |
| `pro-trading-create-subscription.spec.ts` | `user_TC_183_admin` (+ `user_TC_183_mentor`) |
| `telegram-broadcasts-filters.spec.ts` | `user_TC_198_admin` (+ `user_TC_198_mentor`) |
| `telegram-broadcasts-list.spec.ts` | `user_TC_199_admin` (+ `user_TC_199_mentor`) |
| `pro-mailing-create.spec.ts` | `user_TC_201_admin` (+ `user_TC_201_mentor`) |
| `photo-zoom.spec.ts` | `user_TC_39` |
| `mentor-stats-verification.spec.ts` | `user_TC_34_admin` (+ `user_TC_34_mentor`) |
| `mentor-stats-table.spec.ts` | `user_TC_80_admin` (+ `user_TC_80_mentor`) |
| `mentor-stats-filters.spec.ts` | `user_TC_84_admin` |
| `student-open-account.spec.ts` | `user_TC_150` |
| `student-lms-login-logs.spec.ts` | `user_TC_86_admin` |
| `mentor-quick-filters.spec.ts` | `user_TC_126_mentor` |
| `create-edit-roles.spec.ts` | `user_TC_139_admin` |
| `roles-access-section.spec.ts` | `user_TC_138_admin` |
| `student-profile-zoho-sync.spec.ts` | `user_TC_157_admin` (+ `user_TC_157_methodist`) |
| `mentor-assigned-filter.spec.ts` | `user_TC_304_mentor` |
| `mentor-stats-calculation.spec.ts` | `user_TC_69_admin` (+ `user_TC_69_mentor_a`, `user_TC_69_mentor_b`) |

`static_admin` has no Customers access. For this reason, you cannot use it for the Admin Panel UI.

An «Администратор» (`user_TC_186_admin`) has no create button. You may use this user when both conditions are true:

- The test case does not create a student.
- The test case does not read restrictions.

In that case, do not call `shouldSeeAddCustomerButton` / `shouldSeeFullCustomerCard`.

Block/unblock (`user_TC_181`) requires **«Главный администратор»**. With a different role, the UI shows «Не удалось загрузить ограничения».

Create a dynamic student (`createStudent`) through **`runnerAdminApi`** (`getAdminUser()` / `autotest_runner@example.com`). Do not use the `adminApi` of the dedicated manager. The reason: the «Администратор» role has no `action:create` on `users-customers`. The UI login still uses `adminUserKey`.
