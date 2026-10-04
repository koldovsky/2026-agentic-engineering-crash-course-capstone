---
name: init-emulator
description: Set up the emulator application in emulator/ - copy the prepared Yii2 skeleton (tmp/yii-skeleton, made by yii-clone-install + yii-prepare), configure the database with its own migration history (emulator_migration), and generate the code with the skill generate-emulator from its layer specs (EmulatorProcess by the DDD/Yii rules, init migration for table emulator_process, unit tests). Use as step 5 of init-project or on its own when emulator/ is missing or incomplete.
---

# Init emulator (`emulator/`)

`emulator/` is a plain directory of this repository (no submodule). It plays the remote services in tests (flow:
`docs/architecture/flow.md` §6). Same conventions as `init-api`: run from the repository root, commands inside `php-cli`
(`MSYS_NO_PATHCONV=1` in Git Bash), the stack is up (`docker-build`); code by **`code-generation`** with the DDD/Yii rules
(`docs/architecture/ddd-yii2.md`, `.claude/rules/ddd-yii2.md`), checked by **`design-review`**.

## Logging

Log every step with skill **`init-log`** into `<log dir>/log_init-emulator.log` (JSON line: `action`, `start_time`,
`end_time`, `execution_time`). Use the log dir you were given; if started on your own, create one
(`bash .claude/skills/init-log/init-log.sh start`). Pass it on to `yii-clone-install` and `yii-prepare` if you have to run
them (see §2).
Steps to log: `check state`, `copy skeleton tmp/yii-skeleton -> emulator`, `cookie key in .env`, `configure db`,
`configure web and console`, `use skill generate-emulator`, `http smoke test`.

## 1. Check the state
Same as `init-api` §1: an existing `emulator/` is never recreated; only missing files are created, differences are reported,
modified files are never overwritten.

## 2. Copy the prepared skeleton
Same as `init-api` §2, with the target `emulator/`: if `tmp/yii-skeleton` is missing, run **`yii-clone-install`** and
**`yii-prepare`** with `<dir>` = `tmp/yii-skeleton` first; then
```bash
MSYS_NO_PATHCONV=1 docker compose exec -T php-cli sh -c "mkdir -p /app/emulator && cp -an /app/tmp/yii-skeleton/. /app/emulator/"
```
(`-n`: files already in `emulator/` are never overwritten). Check `emulator/vendor/autoload.php` and `php yii help`, then make
sure `.env` has a non-empty `EMULATOR_COOKIE_VALIDATION_KEY` (own value, not the API's) exactly as in `init-api` §2 (generate if
missing, recreate the PHP containers, restart nginx; never printed, never written into a config file).

## 3. Configuration
- `config/db.php`: same as the API (`getenv('DB_HOST')`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `utf8mb4`) - both apps share
  database `demo` (whether the emulator gets its own database is an open decision; do not create one).
- `config/web.php`: `cookieValidationKey` = `getenv('EMULATOR_COOKIE_VALIDATION_KEY') ?: throw new
  \yii\base\InvalidConfigException(...)` naming the variable; JSON parser, `user` stateless (`enableSession => false`, `loginUrl => null`), `urlManager` with
  `enablePrettyUrl`, `enableStrictParsing`, `showScriptName => false`, `rules => []` (emulated service endpoints are added
  later, per module).
- `config/console.php`: `controllerMap['migrate']` = `['class' => yii\console\controllers\MigrateController::class,
  'migrationPath' => ['@app/migrations'], 'migrationTable' => '{{%emulator_migration}}']` - **own migration history**, separate
  from the API's `migration` (shared database).
- **Queue infrastructure** (flow.md §6a; pre-approved dependencies, later used by `generate-emulator` Part B):
  `composer require yiisoft/yii2-queue enqueue/amqp-lib` in `emulator/` (`php-cli`); `config/queue.php` = the `queue`
  component (`yii\queue\amqp_interop\Queue`, `host`/`port`/`user`/`password`/`vhost` from `RABBITMQ_*` env,
  `queueName` `emulator_callbacks`, `exchangeName` `emulator_callbacks_exchange`; no delay-strategy config - the driver
  uses TTL + dead-letter exchange itself); required as `components.queue` from `config/web.php` (publish) and
  `config/console.php`, where `'queue'` is also added to `bootstrap` (gives `queue/listen`, which the
  `emulator-queue-worker` service runs).
- `phpstan.neon` (app root): the project config of `docs/architecture/static-analysis.md` §1 (level 5, `bootstrapFiles`
  Yii.php, `paths`: domain, infrastructure, controllers, modules - the emulator has no top-level `application` yet -,
  `tmpDir: runtime/phpstan`) replacing the skeleton's default, plus `modules/.gitkeep`.
- Verify with `php -l` and `php yii help` (lists `queue/listen`).

## 4. Generate the code - skill `generate-emulator`
Run skill **`generate-emulator`** with the log dir. From its layer specs (`.claude/skills/generate-emulator/specs/01-04`) it
generates, inside out: the domain (`EmulatorProcess`, `EmulatorStatus`, value objects, repository interface), the
infrastructure (ActiveRecord persistence model, repository implementation, the `init_emulator_process` migration applied into
the `emulator_migration` history, the `container` wiring in `config/web.php`) and the domain unit tests; the application and
interface layers stay empty until the first emulated service (specs 02 and 04). It runs the checks of every layer and an
independent `design-review`. Continue only if it reports success.

The rules for this code are in those specs, not here; change a spec (with the user's consent) to change the code.

## 5. Verify
- `php yii help` runs; `http://emulator.dev:81/` answers `404` from Yii, not `500`.
- The report of `generate-emulator`: all layer checks passed, unit tests green, the history in `emulator_migration`, the API's
  `migration` table unchanged, review verdict without open errors.

## 6. Report
Created/kept files, config changes (own migration table), migration and table, check results, `design-review` verdict,
deviations, open questions (emulator scenario selection, emulator database, signature algorithm).

## Rules
- Never overwrite existing or modified files; never edit `vendor/`; never print `.env` values.
- Never write to the API's tables or its `migration` history.
