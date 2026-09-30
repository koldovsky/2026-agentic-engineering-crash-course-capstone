---
description: How to create an Admin Panel manager through the API (roles and UI)
globs: tests/specs/regression/admin-panel/**/*.ts,test-data/admin/**/*.ts,test-data/users/static/**
alwaysApply: false
paths:
  - "tests/specs/regression/admin-panel/**/*.ts"
  - "test-data/admin/**/*.ts"
  - "test-data/users/static/**"
---

# Admin Panel: creating a manager on stage

A student (`POST /users-customers`) **cannot** log in to the Admin Panel. Create a manager in **«Управление → Менеджеры»** or through the API as `autotest_runner@example.com`. Never commit the Bearer token.

```
POST /api/v2/auth/admin/sign-in
POST /api/v2/admin/users
```

Choose the `roleId` by what the test case actually checks. The role is not always «Администратор».

| Role | roleId | When |
|------|--------|--------|
| «Главный администратор» | `a5db499a-ede5-4590-b2c5-6083110d534f` | "Add user", Profile, Logs, **block/unblock** (`restrictions:read`) |
| «Администратор» | `eca154e7-7806-4de0-a59f-5d6fbe966040` | List + LMS / Journal / Subscriptions (cannot create a student, no Pro restrictions) |
| «Ментор» | `868a201f-9675-43d9-8167-472b748dd232` | No Subscriptions tab (as the test case states) |

After a 201 response, add the key to `stage.json`. Use that key string in the spec (`admin-panel-user-keys.md`).

`shouldSeePage()` checks the generic page. Check the Add button and the set of tabs with `shouldSeeAddCustomerButton` / `shouldSeeTabs` / `shouldSeeFullCustomerCard`. Do not encode the role inside `shouldSeePage`.
