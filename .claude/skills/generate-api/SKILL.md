---
name: generate-api
description: Generate the API host code in demo/ from the layer specs in this skill (specs/01-domain.md, 02-application.md, 03-infrastructure.md, 04-interface.md) - the process tracking (Process entity, Status, value objects, repository interface, ProcessService, ActiveRecord persistence model and repository, container wiring, init_process migration), BaseController, and their unit tests - layer by layer from the inside out, with checks after every layer and an independent design-review. Use when demo/ has the prepared skeleton but not this code (init-api runs it), or to regenerate / check missing files against the specs.
---

# Generate API code (`demo/`)

Generates every code file of the API host from the **layer specs** in `.claude/skills/generate-api/specs/`. The specs are the
source of truth for this skill: read the spec of a layer completely before writing its files, and generate exactly what it
describes - names, signatures, behaviour, messages, tests. Anything a spec does not say is decided by the project rules
(`AGENTS.md`, `docs/architecture/code-design.md`, `docs/architecture/ddd-yii2.md`, rule `.claude/rules/ddd-yii2.md`) and
the `yii2-*` skills - never by memory. If a spec and a rule contradict each other, stop and ask the user.

| Spec | Layer | Files |
|------|-------|-------|
| `specs/01-domain.md` | domain | `demo/domain/process/` (10 files) + `tests/Unit/domain/process/ProcessTest.php` |
| `specs/02-application.md` | application | `demo/application/process/ProcessService.php` + `tests/Unit/application/process/ProcessServiceTest.php` |
| `specs/03-infrastructure.md` | infrastructure | `demo/infrastructure/persistence/` (2 files), migrations `init_process`, `add_service_registry`, `add_service_signature_keys`, `container` wiring in `config/web.php` |
| `specs/04-interface.md` | interface | `demo/controllers/BaseController.php` + `tests/Unit/controllers/BaseControllerTest.php` |

Run from the repository root; PHP commands inside `php-cli` (`MSYS_NO_PATHCONV=1 docker compose exec -T -w /app/demo php-cli
...` in Git Bash). The procedure follows the skill **`code-generation`**; review by **`design-review`**.

## Logging
Log every step with skill **`init-log`** into `<log dir>/log_generate-api.log` (JSON line: `action`, `start_time`,
`end_time`, `execution_time`). Use the log dir you were given (e.g. by `init-api`); if started on your own, create one
(`bash .claude/skills/init-log/init-log.sh start`).
Steps to log: `check preconditions`, `compare with specs`, `generate domain`, `check domain`, `generate application`,
`check application`, `generate infrastructure`, `yii migrate`, `check infrastructure`, `generate interface`,
`check interface`, `unit tests`, `design-review`. A failed step is logged as `FAILED: <action>`.

## 1. Preconditions
- `demo/vendor/autoload.php` exists and `php yii help` runs in `demo/` (the prepared skeleton, copied by `init-api`); else stop
  and name the missing step (`init-api` §2).
- `config/db.php` reads the environment and `config/console.php` has the `migrate` controller map (`init-api` §3); else stop.
- The stack is up and MySQL is healthy (`docker-build`).

## 2. Compare with the specs
For every file of the table above:
- missing → it will be generated;
- present → compare it with its spec. Equal in substance → keep. Different → **never overwrite**: list the differences and ask
  the user whether to keep the file or regenerate it.
Show the user the list (to generate / keep / differs) before writing.

## 3. Generate layer by layer (inside out)
For each layer, in the order 01 → 02 → 03 → 04:
1. Read the spec completely.
2. Write the files it lists (only the missing ones or those the user agreed to regenerate), then the layer's test file.
3. Run the layer's checks from the spec, and `php -l` on every written file:
   ```bash
   MSYS_NO_PATHCONV=1 docker compose exec -T -w /app/demo php-cli php -l <file>
   ```
4. Continue with the next layer only when the checks pass.

Layer specifics:
- **03:** create the migration with `migrate/create` only if none creates `{{%process}}` yet; then
  `php yii migrate --interactive=0`. If the table `process` already exists **without** a matching migration in the history,
  stop and ask the user (never drop or alter tables on your own).
- **03 wiring:** edit `config/web.php` with a minimal `Edit` (add the two `container.singletons` entries); keep everything else.

## 4. Verify
- The full unit suite (the skeleton's default tests are removed by `yii-prepare`):
  ```bash
  MSYS_NO_PATHCONV=1 docker compose exec -T -w /app/demo php-cli sh -c 'vendor/bin/codecept build >/dev/null; vendor/bin/codecept run Unit --no-colors'
  ```
  All green; report the real counts.
- All layer checks again (01-04), and `http://demo.dev/` answers 404 from Yii.

## 5. Independent review
Run skill **`design-review`** on the generated files in a separate pass - a subagent that did not write the code (maker ≠
checker). Fix its errors; fix warnings or explain why they are accepted; send the fixes back for a re-check. If a fix changes
behaviour that a spec describes, **update the spec in the same step** so spec and code stay equal.

## 6. Report
Files generated / kept / differing (per layer), migration and table, check and test results, review verdict with what was
fixed, spec changes, and open questions (CLAUDE.md, plus `docs/architecture/technical.md` §6).

## Rules
- The specs are the source of truth: code that deviates from them is either fixed or the spec is updated with the user's
  consent - never silently different.
- Never overwrite an existing file without the user's consent; never edit `vendor/`; never drop or alter database tables.
- No new Composer dependency without the user's approval.
- Nothing that CLAUDE.md lists as an open decision (authentication, signature, emulator scenario, emulator
  database) is decided here.
