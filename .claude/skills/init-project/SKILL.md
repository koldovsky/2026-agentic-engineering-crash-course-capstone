---
name: init-project
description: Initialise the whole project in one run - build and start the docker stack (docker-build), build one prepared Yii2 skeleton in the temporary directory tmp/yii-skeleton (yii-clone-install + yii-prepare), set up the API in demo/ (init-api) and the emulator in emulator/ (init-emulator) from copies of it, in this order, stopping at the first failing step. Orchestrator only - no build, clone or migration details of its own. Use for first-time setup or to bring a fresh checkout to a working state.
---

# Init project

An orchestrator: it runs the skills below in order and contains no build, clone or migration details itself. Each step must
succeed before the next one starts; on the first failure it stops, so nothing is left half-initialised. The individual
skills can also be run on their own.

The Yii2 skeleton is built and cleaned **once**, in the temporary directory **`tmp/yii-skeleton`** (contents git-ignored by
`tmp/.gitignore`); `init-api` and `init-emulator` each copy it and then do their own work.

Run from the repository root (the directory with `compose.yaml`). In Git Bash on Windows prefix commands that use
`-w /app/...` with `MSYS_NO_PATHCONV=1`.

## Logging

Create the run directory **first**, before any other step, and keep its path for the whole run:

```bash
bash .claude/skills/init-log/init-log.sh start        # prints logs/init_<unix seconds>
```

Log the steps of this skill with skill **`init-log`** into `<log dir>/log_init-project.log` (JSON line: `action`,
`start_time`, `end_time`, `execution_time`). Pass the path to every sub-skill ("log dir: logs/init_<ts>") so each one writes its
own file there and never creates another directory.
Steps to log: `preflight: sub-skills present`, `preflight: local demo/, emulator/ and tmp/yii-skeleton`,
`preflight: hosts file`, `use skill docker-build`, `use skill yii-clone-install (tmp/yii-skeleton)`,
`use skill yii-prepare (tmp/yii-skeleton)`, `use skill init-api`, `use skill init-emulator`, `remove tmp/yii-skeleton`.
A failed step is logged as `FAILED: <action>`.

## 0. Preflight (read-only)

Stop and report on the first problem; change nothing here.

1. **Sub-skills present:** `.claude/skills/docker-build/`, `yii-clone-install/`, `yii-prepare/`, `init-api/`,
   `generate-api/` (with its `specs/01-04`), `init-emulator/`, `generate-emulator/` (with its `specs/01-04`),
   `code-generation/`, `design-review/`, `init-log/` exist. A missing one stops the run - name it.
2. **Local directories:** `demo/` and `emulator/` are plain directories of this repository (no submodules). Note for each
   whether it exists; an existing one is completed by its sub-skill, never recreated, deleted or overwritten. Note whether
   `tmp/yii-skeleton/` already holds a prepared skeleton (then steps 2 and 3 have nothing to do).
3. **Hosts file:** check (read only) whether it contains `127.0.0.1 demo.dev emulator.dev`
   (Windows `C:\Windows\System32\drivers\etc\hosts`, Linux/macOS `/etc/hosts`). If not, tell the user to add it; never edit
   it. This is a warning, not a stop.

## 1. `docker-build`

Run skill **`docker-build`** with the log dir. It builds and starts Docker Compose (nginx on ports 80 and 81, php-fpm,
php-cli, MySQL) and checks that the services are up. Continue only if every service is running and MySQL is healthy.

## 2. `yii-clone-install` → `tmp/yii-skeleton`

Run skill **`yii-clone-install`** with `<dir>` = `tmp/yii-skeleton` and the log dir. It creates the Yii2 basic skeleton and
installs its vendors (built inside the container, then copied to `tmp/yii-skeleton`). Continue only if
`tmp/yii-skeleton/vendor/autoload.php` exists.

## 3. `yii-prepare` → `tmp/yii-skeleton`

Run skill **`yii-prepare`** with `<dir>` = `tmp/yii-skeleton` and the log dir. It deletes the default controllers, models,
commands, assets, views and widgets and fixes the configuration. Continue only if `php yii help` works in the skeleton.

## 4. `init-api`

Run skill **`init-api`** with the log dir. It copies the prepared skeleton into `demo/`, configures the database and the REST
host, and generates the process tracking (`Process`, `BaseController`, migration `init_process`) by the DDD/Yii rules.
Continue only if it reports success.

## 5. `init-emulator`

Run skill **`init-emulator`** with the log dir. It copies the prepared skeleton into `emulator/`, configures the database with
its own migration history (`emulator_migration`, separate from the API's `migration`) and generates `EmulatorProcess` and the
migration `init_emulator_process` by the DDD/Yii rules.

## 6. Clean up

After steps 4 and 5 both succeeded, remove the temporary skeleton:
```bash
MSYS_NO_PATHCONV=1 docker compose exec -T php-cli rm -rf /app/tmp/yii-skeleton
```
On a stop it is **kept**, so a rerun copies it again instead of rebuilding it.

## 7. Final report

Collect it from the sub-skills' reports and the log dir:
- **Services:** state of `nginx`, `php-fpm`, `php-cli`, `mysql` and the ports (`80` = `http://demo.dev`, `81` =
  `http://emulator.dev:81`).
- **Skeleton:** Yii version, what `yii-prepare` removed, repeated steps.
- **Per app** (`demo/`, `emulator/`): what was created per layer, the migrations applied, the tables, and the
  `design-review` verdict.
- **Deviations:** a repeated or skipped step, and why.
- **Left untouched:** existing files that were kept (see Rules).
- **Open questions** that still need the user's decision - the authentication method, the signature algorithm, how a test
  selects the emulator scenario, whether the emulator gets its own database (CLAUDE.md).
- The hosts-file reminder if the preflight warned, and the log dir path.

On a stop: which step failed, the last lines of its error (no secrets), what had already succeeded (the log lines before the
`FAILED:` one), and what the user has to do before running the skill again.

## Rules
- Order is fixed: `docker-build` → `yii-clone-install` → `yii-prepare` → `init-api` → `init-emulator` → clean up. Stop at the
  first failing step; never skip a step or continue past a failure.
- An existing `demo/` or `emulator/` is never deleted or recreated.
- Existing files in `demo/` or `emulator/` are compared with what the sub-skill would create (and with the rules in AGENTS.md) and
  **not overwritten**; differences go into the report.
- Never print secrets from `.env` (passwords, `COMPOSER_GITHUB_TOKEN`), not in the chat and not in the logs.
- Never edit the hosts file or other system files; tell the user.
- No build, clone or migration commands of its own - those belong to the sub-skills (the clean-up `rm` of the temporary
  skeleton is the only exception).
