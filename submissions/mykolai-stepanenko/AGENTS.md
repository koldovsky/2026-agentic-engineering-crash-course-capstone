# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Laravel 13 on PHP 8.5, MySQL 8.4, Redis 8, Node 26, nginx — all in Docker (`compose.yaml`). There is no PHP/Composer/Node on the host; run `php`/`composer`/`artisan` in the `app` container and `node`/`npm` in the `node` container. The `AGENTS.md` shipped by the Laravel skeleton suggests installing PHP on the host — ignore that part here.

- `app` — php-fpm 8.5 built from `.docker/php/Dockerfile` (Composer included; runs as `www-data` remapped to the host UID/GID so files in the bind mount stay owned by you). OPcache is built into PHP 8.5, so it is not installed as an extension.
- `nginx` — serves `public/`, proxies PHP to `app:9000` (`.docker/nginx/default.conf`, resolves `app` at request time so recreating `app` doesn't cause 502). App at http://localhost:8080 (`APP_PORT`).
- `mysql` — MySQL 8.4, host port 33060 (`FORWARD_DB_PORT`); `.env` uses `DB_HOST=mysql`, db/user `laravel`/`laravel`, password `secret`.
- `redis` — Redis 8 (`redis:8-alpine`), host port 63790 (`FORWARD_REDIS_PORT`); PHP uses the `phpredis` extension, `.env` has `REDIS_HOST=redis`.
- `node` — Node 26 (`node:26-alpine`), idles so commands can `exec` into it; runs as host UID/GID; Vite port 5173 (`VITE_PORT`).

## Claude Code hooks

Hooks in `.claude/hooks/*.mjs` run through `.claude/hooks/run-node.sh`, which executes them with Node from the `node` container (`docker compose exec`, or a throwaway `docker compose run` if the stack is down) and preserves the exit code, so `protect-env.mjs` still blocks with exit 2. New Node hooks must be registered in `.claude/settings.json` the same way: `"command": "sh", "args": ["…/run-node.sh", "…/<hook>.mjs"]`. Inside the container `CLAUDE_PROJECT_DIR` is `/var/www/html`.

`log-actions.mjs` also runs on `InstructionsLoaded`, `SubagentStart` and `SubagentStop`, and tags tracked usage in `.agent-log/actions.jsonl` with a `usage` field: `rule:<name>` (a `.claude/rules` file was loaded), `subagent:<type>` (e.g. `laravel-tester`), `mcp:<server>:<tool>` (e.g. `mcp:laravel-boost:search-docs`). `phpstan.sh` appends its own `"event":"Larastan"` lines tagged `hook:phpstan` (`mode` edit/stop, `result` ok/errors/skipped/released, `errors`, `attempt`, `ms`). Summary: `jq -r 'select(.usage) | .usage' .agent-log/actions.jsonl | sort | uniq -c`.

`.claude/hooks/phpstan.sh` runs `vendor/bin/phpstan --memory-limit=2G` in the `app` container: on PostToolUse (`Edit|Write|MultiEdit`) after any `.php` file is written — errors exit 2 and come back to the agent — and on Stop, where it blocks finishing the turn while errors remain (max 3 forced retries, counter in `.claude/.phpstan-stop-attempts`). **Larastan errors must be fixed immediately, in code** — never with `@phpstan-ignore`, a baseline, or a lower level. Skipped when `app` isn't running.

`.claude/hooks/tests.sh` works the same way for the test suite: after any `.php` write (PostToolUse) and on Stop it runs `php artisan test --compact` in `app`; failures exit 2 / block the Stop (max 3 retries, counter in `.claude/.tests-stop-attempts`). **Failing tests must be fixed immediately** — fix production code; if a test itself is wrong, hand it to `laravel-tester`; never delete, skip or weaken a test. The only expected red is `laravel-tester`'s TDD red phase (the hook tells it so via `agent_type`). Logged as `hook:tests`.

## Commands

Export `UID`/`GID` first so the image is built with your user IDs (zsh's `UID` is read-only but already set, so just `export UID GID=$(id -g)`):

```sh
docker compose up -d --build
docker compose exec app php artisan migrate
docker compose exec app php artisan test
docker compose exec app vendor/bin/phpstan analyse --memory-limit=2G   # Larastan
docker compose exec node npm install && docker compose exec node npm run build
```

Larastan config is `phpstan.neon` (level 6, paths `app/`). Don't lower the level or add ignores to make analysis pass — fix the code.

Tests are owned by the `laravel-tester` subagent (`.claude/agents/laravel-tester.md`, TDD): delegate writing failing tests to it before implementing a feature or fix, implement until they pass, then have it verify the suite. It edits only `tests/`.

Laravel Boost (`laravel/boost`, dev) is installed. Its MCP server `laravel-boost` runs in the container (`.mcp.json` → `docker compose exec -T app php artisan boost:mcp`), so the stack must be up. Boost's guidelines live in `.claude/rules/laravel-boost.md` (always loaded); they say `php artisan …`/`vendor/bin/…` — run them via `docker compose exec app`. Refresh guidelines/skills with `docker compose exec app php artisan boost:update`; `boost:update`/`boost:install` re-insert the `<laravel-boost-guidelines>` block into `AGENTS.md` — move it back into that rule file afterwards instead of keeping two copies.
