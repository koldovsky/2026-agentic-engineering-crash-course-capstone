# Architecture

This file is the map of the code layers. For conventions inside a layer, read the rules in
`.claude/rules/`. For the documents, start at [docs/index.md](docs/index.md).

## Layers

| Layer | Folder | Holds | May import |
|---|---|---|---|
| Spec | `tests/specs/{api,regression}/` | scenarios: steps, actions, `should*` calls, no `expect` in regression specs | everything below |
| Spec helper | `tests/specs/**/helpers/`, `tests/helpers/` | flows that several specs repeat, test-data setup | POM, core, fixtures, utils, test-data |
| Fixture | `fixtures/`, `tests/specs/**/base-*.ts` | wiring: builds POM objects, API clients and users for a test | POM, core, utils, test-data, config |
| Page object | `page-objects/{lms,admin,landing,stripe,base}/` | locators, actions (`click*`, `open*`, `fill*`) and checks (`should*`) of one page or component | other page objects, utils, test-data, config |
| API client | `core/api/{admin,lms,mailpit}/`, `core/api/base-api-client.ts` | HTTP calls, status checks, response types | utils, config, other API clients |
| Utilities | `utils/{constants,types,assertions,helpers}/`, `utils/step-decorator.ts` | routes, labels, types, assertion wrappers, `DateHelper`, `UserManager` | see "Known violations" |
| Config | `config/` | environment selection (`ENV`), env managers | utils |
| Data | `test-data/`, `schemas/` | static users, product and cycle ids, AJV schemas | utils |

The direction goes one way: a layer imports from the rows below it, never from the rows above it.
Page objects never import API clients or fixtures. API clients never import page objects.

## Measured on 2026-09-30

Import counts by folder, from `grep "from '@/…"`:

- `page-objects` imports `utils` (316), other `page-objects` (88), `test-data` (16), `config` (1).
  It has no import of `core` or `fixtures`.
- `core` imports `utils` (101), `core` (17), `config` (11).
- `fixtures` imports `page-objects` (58), `utils` (12), `core` (9), `test-data` (4), `config` (4).

## Known violations

`utils` is not a pure bottom layer:

- `utils/helpers` imports `core` 15 times. For example, `ApiHelper` builds API clients.
- `utils` imports `page-objects` 4 times and `fixtures` once.

[docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md) records these imports.
No check enforces the direction yet.

## Checks that enforce parts of this map

- `npm run rules:lint` checks these rules:
  - no `expect` in regression specs
  - no relative imports (use `@/`)
  - no hard-coded endpoints (use `utils/constants/routes.ts`)
  - no `UserFactory` in specs
  - page objects stay at 300 lines or fewer
- `npm run typecheck` and `npm run lint` check the types and the ESLint rules.
