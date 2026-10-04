---
name: docker-build
description: Build and start the project's docker compose stack (nginx on ports 80/81, php-fpm, php-cli, mysql, rabbitmq, emulator-queue-worker) and verify that the services are up. Use when the environment must be built or restarted, after changes in compose.yaml or docker/**, or as the first step of project initialisation.
---

# Docker build

## Logging

Log every step with skill **`init-log`** into `<log dir>/log_docker-build.log` (JSON line: `action`, `start_time`, `end_time`,
`execution_time`). Use the log dir you were given by the calling skill; if you were started on your own, create one (`bash .claude/skills/init-log/init-log.sh start`).
Steps to log: `check docker and .env`, `docker compose config`, `docker compose up -d --build`, `docker compose ps`, `wait for mysql healthy`, `nginx -t`, `php and composer versions`.

Run from the repository root (the directory with `compose.yaml`). Services and ports: `docs/architecture/technical.md`.

## 0. Preconditions
- Docker is running (`docker info`); otherwise stop and tell the user.
- `.env` exists (`cp .env.example .env` if not) and contains `MYSQL_ROOT_PASSWORD`, `MYSQL_USER`, `MYSQL_PASSWORD`.
  If the passwords are still the placeholders from `.env.example`, tell the user; `COMPOSER_GITHUB_TOKEN` may be empty but
  then Composer can hit GitHub rate limits. Never print secret values.
- Ports 80 and 81 (nginx), 3306 (mysql), and 5672/15672 (rabbitmq) are free on the host; if `up` fails with "port is
  already allocated", report it.
- `.env` also contains `RABBITMQ_USER`, `RABBITMQ_PASSWORD` (if still empty/placeholder, tell the user - the
  `emulator-queue-worker` and the emulator's queue publisher will fail to authenticate).

## 1. Build and start

```bash
docker compose config -q
docker compose up -d --build
docker compose ps
```

## 2. Verify
- `nginx`, `php-fpm`, `php-cli`, `emulator-queue-worker` are `running`; `mysql` and `rabbitmq` are `healthy` (wait for
  them; if not healthy after ~2 minutes read `docker compose logs mysql` / `docker compose logs rabbitmq` and stop).
- `docker compose exec nginx nginx -t` prints "test is successful".
- `docker compose exec php-cli php -v` shows PHP 8.3; `docker compose exec php-cli composer --version` works.
- `emulator-queue-worker` has no repeated connection errors in its log (`docker compose logs emulator-queue-worker`) -
  before `emulator/` exists (no `yii` executable yet) it is expected to be crash-looping; note that, don't treat it as
  a stop condition during `init-project`.

## 3. Report
Service states, the published ports (`80` = API `demo.dev`, `81` = emulator `emulator.dev`, `15672` = RabbitMQ
management UI), and the reminder that the hosts file needs `127.0.0.1 demo.dev emulator.dev` (do not edit system files
yourself).

## Rules
- Only `docker compose` commands; never `docker system prune`, `down -v` or anything that deletes the `mysql-data` volume
  without the user's explicit request.
- Environment changes go through `compose.yaml`, `docker/**` and `.env.example` (see AGENTS.md).
