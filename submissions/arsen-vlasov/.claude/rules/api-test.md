---
description: API tests — invariants and known endpoint quirks (always true, including when editing existing specs)
globs: tests/specs/api/**/*.spec.ts,schemas/api/**/*.ts,fixtures/api/**/*.ts,utils/helpers/api/**/*.ts
alwaysApply: false
paths:
  - "tests/specs/api/**/*.spec.ts"
  - "schemas/api/**/*.ts"
  - "fixtures/api/**/*.ts"
  - "utils/helpers/api/**/*.ts"
---

# API tests: invariants

The `api-test` skill (`.claude/skills/api-test/SKILL.md`) contains the procedure to write a new test.
This file contains only the facts that are always true.

## Known API quirks

| Endpoint | Quirk |
|---|---|
| POST /api/v2/auth/admin/sign-in | Wrong credentials → **403** (not 401) |
| POST /api/v2/auth/admin/sign-in | Valid creds → **200** with `TWO_FACTOR_*` + challenge/setup `token`, not session tokens |
| POST /api/v2/auth/admin/2fa/verify | Completes login. Stage/Dev test code **<2fa-test-code>** for `@example.com` / `@mailinator.com` / `@acme.it` |
| POST /api/v2/auth/admin/2fa/generate + `/confirm` | First-time setup (`TWO_FACTOR_SETUP_REQUIRED`). Then sign in again → challenge |
| POST /api/v2/auth/admin/logout | Requires `{ refreshToken }` in body AND `Authorization: Bearer` header |
| POST /api/v2/auth/admin/logout | Success → **204** No Content |
| POST /api/v2/auth/admin/logout | No Authorization header → **403** (not 401) |
| POST /api/v2/auth/admin/logout | Invalid Bearer → **401** |
| POST /api/v2/auth/admin/logout | Idempotent. A repeat call with the same tokens → **204** |
| POST /api/v2/auth/admin/refresh | Invalid refreshToken → **401** |

## ❌ Forbidden

```
NEVER hardcode endpoint paths ('/api/v2/...'). Use AdminRoutes.* constants.
NEVER use `adminToken` fixture in logout or refresh tests.
NEVER skip validateSchema() on 200 responses.
NEVER place expect() outside test.step().
NEVER use relative imports (../../). Use @/ path aliases.
NEVER write linkTestCase() inside individual test() — put it in beforeEach.
NEVER reuse the same dynamic user across mutation tests in parallel workers.
NEVER assume 401 for bad credentials on sign-in — this API returns 403.
NEVER add authZ or tenant isolation tests for Medium or Low priority endpoints.
```
