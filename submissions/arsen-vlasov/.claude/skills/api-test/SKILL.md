---
name: api-test
description: >-
  Step-by-step procedure to write a NEW Playwright API test for an endpoint. It covers
  the check in the docs/references/endpoints.csv registry, coverage depth by priority,
  the route constant and the AJV schema. It also covers the choice of a static or dynamic
  user, the file location and the canonical spec skeleton. Use it when asked to write or
  add an API test, to cover an endpoint with tests, or to create a response schema. For
  invariants that apply when you edit existing API specs, see the api-test.md rule.
---

# Writing an API test for an endpoint

The order of the steps is mandatory. Each step needs the result of the previous step.

## 1. Check the endpoint

Run the lookup. Do not read `docs/references/endpoints.csv` by eye. The file has a UTF-8 BOM, 143 rows and
path templates like `{userId}`. A missed row means an invented test.

```bash
node .claude/skills/api-test/scripts/endpoint-lookup.mjs <path> [METHOD]
```

- **exit 1** → stop. Report: "Endpoint not in registry (docs/references/endpoints.csv)." Do not write anything.
- **exit 0** → the JSON gives `method`, `tags`, `priority`. Use them in every step below.
  If there is more than one row and you gave no METHOD, ask which row to use, or run the lookup
  again with the METHOD.

## 2. Understand the test strategy

Read the API test strategy, `docs/test-strategy/api/index.md`:
- section 7 in `docs/test-strategy/api/approach.md`: test types (happy path, contract, validation, authN, authZ, tenant isolation, idempotency)
- section 8 in `docs/test-strategy/api/coverage.md`: coverage depth by priority:
  - `Highest` → full matrix: happy path + contract + validation + authN + authZ (RBAC) + tenant isolation (P0)
  - `High` → happy path + contract + validation + authN + authZ
  - `Medium` → happy path + contract + validation + authN
  - `Low` → smoke only: happy path + authN

## 3. Route constant

Search `utils/constants/routes.ts` for the literal path string. But that file holds
**six** route objects plus two resolvers. A plain grep will take you to the wrong one.

In an API **spec**, always use the flat exported `AdminRoutes` (as `admin-sign-in.spec.ts`
does): `AdminRoutes.Admin.Auth.SignIn`.

Do not use these in a spec:

| What grep will also find | Why not |
|---|---|
| `AdminRoutesLegacy`, `AdminRoutesMonolith` | module-private, not exported at all |
| `getAdminRoutes(useMonolith)` | for API clients in `core/api/`, whose base URL varies by environment |
| `AdminMonolithRoutes`, `LmsMonolithRoutes` | monolith-only paths, a different base URL |

- **Found in `AdminRoutes`** → use that constant
- **Found only in one of the others** → the path exists, but not where a spec can use it.
  Add it to `AdminRoutes` in the matching namespace. Then use it
- **Not found anywhere** → add it to `AdminRoutes`. Then use it

Never hardcode endpoint path strings in spec files.

## 4. AJV schema

Schema location: `schemas/api/<domain>/<endpoint-name>.schema.ts`

Map the domain from the CSV `tags`:
- "ADMIN Authentication" → `auth`
- "ADMIN Roles" → `roles`
- "ADMIN Permissions" → `permissions`
- "ADMIN User Managers" → `users`
- "ADMIN User Customers" → `user-customers`
- etc.

If the schema does not exist, create it with a `successSchema` for the 200 response.
Always reuse `apiErrorResponseSchema` from `schemas/api/auth/admin-sign-in.schema.ts` for error bodies.

## 5. Static vs dynamic users

**First principle: "does the test mutate the authenticated user?"**

```
Q1: Does the endpoint mutate the authenticated user themselves?
    (own password / email / profile / tokens / sessions)
    → Yes → DYNAMIC user — ask the user to create one, wait for credentials
    → No  → Q2

Q2: Does the endpoint mutate a shared resource (other user, role assignment)?
    → Yes → DYNAMIC user
    → No  → STATIC user
```

Static users (`test-data/users/static/stage.json`):

| Key | Role |
|-----|------|
| `static_super_admin` | `Главный администратор` |
| `static_admin` | `Администратор` |
| `static_mentor` | `Ментор` |
| `static_methodist` | `Методист` |

Access: `UserManager.getInstance().getAdminUser('static_super_admin')`

**Logout and refresh tests ALWAYS use `getAdminSession()`** from `utils/helpers/api/admin-session.helper.ts`.
Never use the `adminToken` fixture in those tests. It is worker-scoped and shared.

## 6. File location

```
tests/specs/api/<domain>/<method>-<slug>.spec.ts
```

Examples:
- `tests/specs/api/auth/admin-sign-in.spec.ts`
- `tests/specs/api/roles/admin-get-roles.spec.ts`
- `tests/specs/api/users/admin-create-user.spec.ts`

## 7. Canonical file structure

```typescript
import { test, expect } from '@/fixtures/api/admin-api.fixture';
import { HttpStatus } from '@/utils/constants/http-status-codes';
import { validateSchema } from '@/utils/helpers/schema-validator';
import { successSchema, apiErrorResponseSchema } from '@/schemas/api/<domain>/<name>.schema';
import { getAdminSession } from '@/utils/helpers/api/admin-session.helper'; // if needed
import { UserManager } from '@/test-data/users/static/user-manager'; // if static users needed
import { linkTestCase } from '@/utils/helpers/allure-helper';
import { AdminRoutes } from '@/utils/constants/routes';

const ENDPOINT = AdminRoutes.<Namespace>.<Action>;

test.describe('<METHOD> <path>', () => {
  test.beforeEach(async () => {
    await linkTestCase(<N>, <caseId>); // N from the key PRJ-TC-N; caseId from the AIO link, if known
  });

  test('happy path — <description>', async ({ apiRequest }) => {
    const response = await test.step('Send request', () =>
      apiRequest.post(ENDPOINT, { data: { ... } }),
    );

    await test.step('Status is 200', () => {
      expect(response.status()).toBe(HttpStatus.OK);
    });

    const body = await response.json();

    await test.step('Validate response schema', () => {
      validateSchema(successSchema, body);
    });
  });
});
```

Test order within the file: happy path → contract → validation → authN → authZ → tenant isolation → idempotency

## 8. Reference files

| File | Purpose |
|------|---------|
| `tests/specs/api/auth/admin-sign-in.spec.ts` | Canonical: POST auth, static user, 8 tests (Highest) |
| `tests/specs/api/auth/admin-refresh.spec.ts` | POST action, getAdminSession, 5 tests |
| `tests/specs/api/auth/admin-logout.spec.ts` | POST action, idempotency, 5 tests |
| `schemas/api/auth/admin-sign-in.schema.ts` | Canonical `apiErrorResponseSchema` |
| `utils/helpers/api/admin-session.helper.ts` | `getAdminSession()` |
| `utils/constants/routes.ts` | `AdminRoutes` structure |
| `fixtures/api/admin-api.fixture.ts` | `apiRequest` and `adminToken` fixtures |
| `docs/references/endpoints.csv` | 143 endpoints: method, tags, priority. Read it through `scripts/endpoint-lookup.mjs` |
| `docs/test-strategy/api/index.md` | Test types and depth per priority |


## 9. Prove the test can fail

A green API test proves nothing until you see it red for the right reason.

1. Run the new spec: `ENV=stage npx playwright test --project=api <spec>`. It must pass.
2. Break one thing the test claims to check. Pick one:
   - in the schema, make a field that the response has `required` with a wrong `type`.
   - in a negative test, change the expected status (`HttpStatus.Forbidden` → `HttpStatus.OK`).
3. Run again. It must fail **on that assertion**, not on something else. Copy the failing line.
4. Revert the change. `git diff` must show only the new test. Run once more. It must be green.

If step 3 stays green, the test does not check what its title says. Fix the test, not the mutation.
Report both runs: the green one and the red one with its failing line.

## Before showing the result

- [ ] The endpoint is present in `docs/references/endpoints.csv` and coverage depth matches its `priority`
- [ ] The path goes through `AdminRoutes.*` only, with no string literals
- [ ] Every 200 response goes through `validateSchema()`
- [ ] Every `expect()` sits inside a `test.step()`
- [ ] Imports use `@/`, never `../../`
- [ ] `linkTestCase()` is in `beforeEach`, not inside `test()`
- [ ] Invariants and known API quirks checked against the `api-test.md` rule
- [ ] Seen red on a mutation and green after the revert (§9)
- [ ] `npm run check` run, and its real result reported
