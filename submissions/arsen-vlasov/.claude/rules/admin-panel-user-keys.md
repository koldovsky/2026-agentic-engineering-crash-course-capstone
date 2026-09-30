---
description: Admin Panel — user key from stage.json, no aliases
globs: tests/specs/regression/admin-panel/**/*.ts,test-data/admin/**/*.ts,test-data/users/static/**
alwaysApply: false
paths:
  - "tests/specs/regression/admin-panel/**/*.ts"
  - "test-data/admin/**/*.ts"
  - "test-data/users/static/**"
---

# Admin Panel: user keys without aliases

Accounts are only in `test-data/users/static/stage.json`. In a spec or helper, use **that same key as a string**.

```ts
test.use({ adminUserKey: 'user_TC_186_admin' });
const student = userManager.getLmsUser('student_admin_pro_deactivate');
const mentor = userManager.getAdminUser('user_TC_186_mentor');
```

Never copy an email or password into a spec. Use `UserManager`.

## ❌ Anti-pattern

A file or `export const` that holds synonyms for the keys (`DEACTIVATE: 'student_admin_pro_deactivate'`). It is a second catalogue of the same strings. Nothing validates it against the JSON.

```ts
export const PRO_TRADING_DEACTIVATE_STATIC_USERS = {
  DEACTIVATE: 'student_admin_pro_deactivate',
};
userManager.getLmsUser(PRO_TRADING_DEACTIVATE_STATIC_USERS.DEACTIVATE);
```

UI constants (table columns, filter labels) are not user keys. Keep them.

To create a manager, see `admin-panel-create-admin-user.md`. For one dedicated admin per spec, see `admin-panel-dedicated-admin-user.md`.
