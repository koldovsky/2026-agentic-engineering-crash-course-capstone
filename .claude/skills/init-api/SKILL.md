---
name: init-api
description: Set up the API host application in demo/ - copy the prepared Yii2 skeleton (tmp/yii-skeleton, made by yii-clone-install + yii-prepare), configure the database and the stateless REST host, and generate the code with the skill generate-api from its layer specs (process tracking by the DDD/Yii rules, BaseController, init migration for table process, unit tests). Use as step 4 of init-project or on its own when demo/ is missing or incomplete.
---

# Init API (`demo/`)

`demo/` is a plain directory of this repository (no submodule). Run from the repository root; all PHP/Composer commands run
inside `php-cli` (`docker compose exec ...`); in Git Bash prefix commands with `-w /app/...` with `MSYS_NO_PATHCONV=1`. The
stack must be up (skill `docker-build`).

Code is written by the skill **`code-generation`** (rules: `docs/architecture/code-design.md`, `docs/architecture/ddd-yii2.md`,
rule `.claude/rules/ddd-yii2.md`) and checked by **`design-review`**. Yii facts from the `yii2-*` skills only.

## Logging

Log every step with skill **`init-log`** into `<log dir>/log_init-api.log` (JSON line: `action`, `start_time`, `end_time`,
`execution_time`). Use the log dir you were given by the calling skill; if you were started on your own, create one
(`bash .claude/skills/init-log/init-log.sh start`). Pass the log dir on to `yii-clone-install` and `yii-prepare` if you
have to run them (see §2).
Steps to log: `check state`, `copy skeleton tmp/yii-skeleton -> demo`, `cookie key in .env`, `configure db`,
`configure web and console`, `use skill generate-api`, `http smoke test`.

## 1. Check the state
- `demo/` does not exist → full run (steps 2-6).
- `demo/` exists → do **not** recreate or overwrite anything. Compare every file this skill would create with what is there,
  create only what is missing, and list the differences in the report. Modified files are never overwritten; ask the user.

## 2. Copy the prepared skeleton
The skeleton is built once by `init-project` (steps 2-3) in **`tmp/yii-skeleton`**. Started on your own and it is missing
(no `tmp/yii-skeleton/vendor/autoload.php`) → run skill **`yii-clone-install`** and then **`yii-prepare`**, both with `<dir>` =
`tmp/yii-skeleton`, first.
1. Copy it (inside the container; `-n` never overwrites a file that is already in `demo/`):
   ```bash
   MSYS_NO_PATHCONV=1 docker compose exec -T php-cli sh -c "mkdir -p /app/demo && cp -an /app/tmp/yii-skeleton/. /app/demo/"
   ```
   Then `demo/vendor/autoload.php` exists and `php yii help` runs in `demo/`.
2. Make sure the app's cookie key exists in the environment: if `.env` has no non-empty `DEMO_COOKIE_VALIDATION_KEY`, append
   a new random 32-character value (e.g. from `node -e "process.stdout.write(require('crypto').randomBytes(16).toString('hex'))"`)
   and recreate the PHP containers (`docker compose up -d`, then `docker compose restart nginx` - nginx keeps the old
   php-fpm address otherwise and answers 502). Never print the value; never write a key into a config file.

## 3. Configuration (AGENTS.md "Host application rules")
- `config/db.php`: `yii\db\Connection` with `dsn` built from `getenv('DB_HOST')` and `getenv('DB_NAME')`, `username` =
  `getenv('DB_USER')`, `password` = `getenv('DB_PASSWORD')`, `charset` = `utf8mb4`. No credentials in files.
- `config/web.php`:
  - `request`: `cookieValidationKey` = `getenv('DEMO_COOKIE_VALIDATION_KEY') ?: throw new \yii\base\InvalidConfigException(...)`
    naming the variable (replaces the skeleton's hard-coded key); `parsers` → `'application/json' => yii\web\JsonParser`.
  - `user`: `enableSession => false`, `loginUrl => null`, no `identityClass` yet (authentication is an open decision).
  - `urlManager`: `enablePrettyUrl => true`, `enableStrictParsing => true`, `showScriptName => false`, `rules => []`
    (module routes come from each module's `bootstrap()`, the modules listed in `modules` and `bootstrap`).
  - no view-related components are needed.
- `config/console.php`: `controllerMap['migrate']` = `['class' => yii\console\controllers\MigrateController::class,
  'migrationPath' => ['@app/migrations'], 'migrationNamespaces' => []]` (module namespaces are appended by module bootstraps;
  history table: the default `migration`).
- `phpstan.neon` (app root): replace the skeleton's default with the project config of `docs/architecture/static-analysis.md`
  §1 (level 5, `bootstrapFiles: vendor/yiisoft/yii2/Yii.php`, `paths`: domain, application, infrastructure, controllers,
  modules, `tmpDir: runtime/phpstan`), and create `modules/.gitkeep` (PHPStan fails on a path that does not exist; the
  modules are added later). Run `vendor/bin/phpstan analyse` after `generate-api`: no errors.
- Verify: `php -l` on every changed config file; `php yii help` runs.

## 4. Generate the code - skill `generate-api`
Run skill **`generate-api`** with the log dir. From its layer specs (`.claude/skills/generate-api/specs/01-04`) it generates,
inside out: the domain (`Process`, `Status`, value objects, repository interface, exceptions), the application service
(`ProcessService`), the infrastructure (ActiveRecord persistence model, repository implementation, the `init_process`
migration applied, the `container` wiring in `config/web.php`), and the interface layer (`BaseController`), each with its
unit tests; it runs the checks of every layer and an independent `design-review`. Continue only if it reports success.

The rules for this code are in those specs, not here; change a spec (with the user's consent) to change the code.

## 5. Verify
- `php yii help` runs; `http://demo.dev/` answers `404` from Yii, not `500`.
- The report of `generate-api`: all layer checks passed, all unit tests green, review verdict without open errors.

## 6. Report
Created/kept files per layer, config changes, the migration and the table, test/check results, `design-review` verdict,
deviations (e.g. `--prefer-dist`), and the open questions (authentication, signature, emulator scenario,
emulator database).

## Rules
- Never overwrite existing or modified files; never edit `vendor/`; never print `.env` values.
- Module-specific code never goes into `demo/`.
- No Composer dependency beyond the skeleton without the user's approval.
