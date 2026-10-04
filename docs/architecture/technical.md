# Technical architecture

## 1. Overview

REST API on Yii2 (PHP 8.3) for working with external services through an endpoint interface. Two Yii2 applications
share one Docker Compose stack:

| Application | Host | Directory | Role |
|-------------|------|-----------|------|
| API | `demo.dev` | `demo/` (`/app/demo`) | web service; delegates requests to modules |
| Emulator | `emulator.dev` | `emulator/` (`/app/emulator`) | emulates the remote services to test all modules |

New features ship as Yii2 modules inside the applications - `demo/modules/<id>/` and the emulated service in
`emulator/modules/<id>/` (see [modules](../modules/README.md)). Behaviour of the request handling: [flow.md](flow.md).

## 2. Repository layout

| Path | Purpose |
|------|---------|
| `demo/` | API application (Yii2), plain directory created by `init-api`; web root `demo/web/`; modules in `demo/modules/<id>/` |
| `emulator/` | emulator application (Yii2), plain directory created by `init-emulator`; web root `emulator/web/`; emulated services in `emulator/modules/<id>/` |
| `docker/`, `compose.yaml` | Docker Compose stack |
| `.claude/skills/` | project skills for AI agents |
| `logs/` | logs of the initiation skills, git-ignored: `logs/init_<timestamp>/log_<skill name>.log` (skill `init-log`) |
| `tmp/` | temporary files, git-ignored (`tmp/.gitignore`); `tmp/yii-skeleton` = the prepared Yii2 skeleton that `init-project` builds once and `init-api` / `init-emulator` copy (removed after a successful run) |
| `docs/` | documentation |

## 3. Docker Compose services

Project root is mounted at `/app`.

| Service | Build | Purpose |
|---------|-------|---------|
| `nginx` | `docker/nginx/Dockerfile` | hosts `demo.dev` (API, port 80, root `/app/demo/web`) and `emulator.dev` (emulator, port 81, root `/app/emulator/web`); HTTP only |
| `php-fpm` | `docker/php/Dockerfile` (`php:8.3-fpm`) | runtime of both applications, `:9000` |
| `php-cli` | `docker/php/Dockerfile` (`php:8.3-cli`) | Composer, `php yii`, tests, git |
| `emulator-queue-worker` | `docker/php/Dockerfile` (`php:8.3-cli`) | long-running `php yii queue/listen --verbose` in `/app/emulator`; consumes the delayed-callback queue (flow.md §6a) |
| `mysql` | `mysql:8.0` | database `demo`, port 3306, volume `mysql-data` |
| `rabbitmq` | `rabbitmq:3-management` | AMQP `5672`, management UI `15672`; the emulator's delayed-callback queue (flow.md §6a); volume `rabbitmq-data` |

- nginx: two `server` blocks in `docker/nginx/default.conf` (`demo.dev` listens on 80, `emulator.dev` on 81; published as `80:80` and
  `81:81` in `compose.yaml`), both pass PHP to `php-fpm:9000`, pretty URLs via
  `try_files`. The Compose network aliases `demo.dev` and `emulator.dev` point to nginx, so containers reach each other by host
  name and port: the API calls the emulator at `http://emulator.dev:81`, the emulator calls the API back at `http://demo.dev`. The host's hosts file needs
  `127.0.0.1 demo.dev emulator.dev`.
- PHP image (shared by php-fpm and php-cli, `PHP_BASE` build arg): Yii2 requirements (`intl`, `zip`, `pdo_mysql`,
  `opcache`), `sockets`/`bcmath` (php-amqplib, the emulator's RabbitMQ client - flow.md §6a), Xdebug
  (`docker/php/xdebug.ini`, env `XDEBUG_MODE`, `XDEBUG_CLIENT_HOST`, `XDEBUG_CLIENT_PORT`=9003,
  IDE key `PHPSTORM`), Git, Composer 2.
- Composer API key (GitHub token): env `COMPOSER_GITHUB_TOKEN`, written to `auth.json` by `docker/php/entrypoint.sh`.
- MySQL: `MYSQL_ROOT_PASSWORD`, `MYSQL_USER`, `MYSQL_PASSWORD` from `.env`, set in `compose.yaml`;
  `docker/mysql/init/01-init.sh` (runs once on an empty volume) creates database `demo`.
- Application DB config reads `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` via `getenv()`.
- Cookie validation keys: `DEMO_COOKIE_VALIDATION_KEY` (API) and `EMULATOR_COOKIE_VALIDATION_KEY` (emulator) from `.env`, one
  per application because both apps run in the same php-fpm / php-cli containers (shared `php-environment` in
  `compose.yaml`). Each `config/web.php` reads its own with `getenv()` and throws `InvalidConfigException` when it is empty; no
  key is committed (only the fixed test key in `config/test.php`). php-fpm passes the variables to PHP (`clear_env = no` in
  the image's `docker.conf`).
- After changing `.env`, recreate the PHP containers (`docker compose up -d`) and then `docker compose restart nginx`: nginx
  resolves `php-fpm` once at start and answers 502 with the old container address.
- RabbitMQ: `RABBITMQ_USER`/`RABBITMQ_PASSWORD` from `.env` (`RABBITMQ_DEFAULT_USER`/`_PASS` of the `rabbitmq` service);
  `RABBITMQ_HOST=rabbitmq`, `RABBITMQ_PORT=5672`, `RABBITMQ_VHOST=/` are fixed (shared `php-environment` anchor, so
  `emulator-queue-worker` sees the same values as php-fpm/php-cli). Only the emulator uses it (flow.md §6a); the API
  does not connect to RabbitMQ.

```text
client / module --> nginx -+- demo.dev:80 ---> php-fpm --> /app/demo     (API)      --+
                           +- emulator.dev:81 -> php-fpm --> /app/emulator (emulator) --+--> mysql
```

### Commands

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec -w /app/demo php-cli composer install
docker compose exec -w /app/demo php-cli php yii migrate
docker compose exec -w /app/emulator php-cli php yii migrate
```

In Git Bash on Windows prefix commands that use `-w /app/...` with `MSYS_NO_PATHCONV=1`.

## 4. API application (`demo/`)

- Stateless (`enableSession => false`), JSON body parser, pretty URLs with strict parsing.
- `app\controllers\BaseController` is the parent of module controllers.
- Modules in `demo/modules/<id>/` are registered in `config/web.php` (`modules`, `bootstrap` - each module adds its URL rules in
  `bootstrap()`) and their migration namespaces in `config/console.php` `migrationNamespaces`.
- Owns the table `process` with the process progress (see [flow.md](flow.md)); migration `init_process` in `demo/migrations/`.
  Migration history in the default `migration` table (shared with module migrations).

## 5. Emulator application (`emulator/`)

Yii2 application with the same environment as the API. Checks requests, stores its own process data in the database,
answers the API and sends callbacks (flow: [flow.md](flow.md)). Its table `emulator_process` is created by the migration
`init_emulator_process` in `emulator/migrations/`; its migration history is the separate table `emulator_migration`, because both
applications share database `demo`. Both host migrations are created and
applied by the skills `init-api` / `init-emulator` (run by `init-project`). The same skills create `Process` /
`EmulatorProcess` by the DDD/Yii rules ([ddd-yii2.md](ddd-yii2.md)): a plain-PHP entity in `domain/process/`, a repository
interface, and the ActiveRecord persistence model + repository implementation in `infrastructure/persistence/`.

## 6. Open items (TODO)

- Emulator database: same database `demo` (separate table prefix) or a separate database (only `demo` is created now).
- Authentication of the API and the signing algorithm of requests.
- Production deployment, test strategy, CI.
