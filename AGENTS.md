# AGENTS.md

Guidance for AI coding agents working in this repository. `CLAUDE.md` imports this file.

## Project

A **REST API built on Yii2** (PHP 8.3). The API host application is deliberately thin: features are delivered as
**Yii2 modules inside the application** - one per remote service in `demo/modules/<id>/`, with the matching emulated service
in `emulator/modules/<id>/` (not external packages; module code is committed with the app). Every module follows the
**same architecture** described below.

- Stack: Yii2 (`yii\rest\*`), PHP 8.3 (FPM + CLI), nginx, MySQL 8, Docker Compose (`compose.yaml`).
- **Yii2 knowledge source:** only the official guide, `https://www.yiiframework.com/doc/guide/22.0/en/<page>`, and only
  base framework + RESTful web services topics (see the `yii2-*` skills). Do not rely on memory for framework
  behaviour; if the guide does not say it, say so.
- Two Yii2 applications: the **API** (`demo.dev`, `demo/`, web root `demo/web/`) and the **emulator** of remote services
  (`emulator.dev`, `emulator/`, web root `emulator/web/`), used to test all modules (see `docker/nginx/default.conf`). Both are plain
  directories of this repository (no submodules), created by copying one prepared Yii2 basic skeleton (built once in
  `tmp/yii-skeleton` by `yii-clone-install` + `yii-prepare`, run by `init-project`).
- Request flow (see `docs/architecture/flow.md`): every API request has one body `{"requestId", "service_method", "data"}`
  (all first-level keys required; `data` differs per module/method); the API delegates it to a module. Every module has two
  standard requests: **init process** (send a request to the remote service built from the init data, with `callback_url`
  added - the module's own callback endpoint, `http://demo.dev/<module-id>/v1/callback`, flow.md §1a) and **callback**
  from the remote service (result or error). The init response has `status`: our status (`success` | `process` | `fail`,
  mapped from the service's own, possibly complex, statuses - mapping defined per service method in the module - or `error`
  set by the API when the module fails). The API also sets `init`: the process is recorded with it on the init request,
  before the module calls the remote service.
  Some services send no callback and return the final result in the response. The API keeps a process-progress table: a
  record on init, status update on callback (always applied when the new status differs, even after a final one). In tests the module talks to the emulator, which checks the signature and body
  params, saves process data, answers, then - for a service that has one - schedules a callback with a fixed 5-second
  delay through RabbitMQ instead of sending it inline (`docs/architecture/flow.md` §6a; consumed by the
  `emulator-queue-worker` service); tests must cover success and fail.

> Status: the API skeleton (`demo/`) and the emulator skeleton (`emulator/`) are created by the `init-project` skill (`init-api`, `init-emulator`); they may not exist yet.
> When creating it, follow the "Host application" rules below. Never edit `vendor/`.

## Architecture (runtime environment)

Full description: `docs/architecture/technical.md` (technical) and `docs/architecture/flow.md` (flow). Keep them in sync with
`compose.yaml` and `docker/`.

Environment is deployed with `docker compose`; project root is mounted at `/app` (apps: `/app/demo`, `/app/emulator`, so run app
commands with `-w /app/demo` or `-w /app/emulator`). Secrets come from `.env` (copy `.env.example`, git-ignored).

| Service | Build | Purpose |
|---------|-------|---------|
| `nginx` | `docker/nginx/Dockerfile` | two hosts: `demo.dev` (API, port **80**, root `/app/demo/web`) and `emulator.dev` (emulator, port **81**, root `/app/emulator/web`); HTTP only |
| `php-fpm` | `docker/php/Dockerfile` (`php:8.3-fpm`) | runtime of both apps, `php-fpm` on `:9000` |
| `php-cli` | `docker/php/Dockerfile` (`php:8.3-cli`) | Composer, `php yii`, tests, git; idles for `docker compose exec` |
| `mysql` | `mysql:8.0` | database `demo`, port 3306, volume `mysql-data` |

- nginx: one `server` block per host (`demo.dev` listens on 80, `emulator.dev` on 81), pretty URLs via `try_files ... /index.php?$args`, PHP -> `php-fpm:9000`. Add
  `127.0.0.1 demo.dev emulator.dev` to the host's hosts file. The compose network aliases `demo.dev` and `emulator.dev` point to
  nginx so the API and the emulator can call each other by host name.
- php-fpm and php-cli share one Dockerfile (base image passed as `PHP_BASE`): PHP 8.3 with Yii2 requirements
  (`intl`, `zip`, `pdo_mysql`, `opcache`; `mbstring`/`ctype`/PCRE built in), `sockets`/`bcmath` (the emulator's
  RabbitMQ client, `php-amqplib`, flow.md §6a), **Xdebug** (`docker/php/xdebug.ini`, env
  `XDEBUG_MODE`, `XDEBUG_CLIENT_HOST`, `XDEBUG_CLIENT_PORT`=9003, IDE key `PHPSTORM`, PhpStorm server name `demo.dev`),
  **Git**, **Composer 2**.
- Composer API key (GitHub token) comes from env `COMPOSER_GITHUB_TOKEN`; `docker/php/entrypoint.sh` writes
  `auth.json` (`github-oauth`) on container start.
- MySQL: `MYSQL_ROOT_PASSWORD`, `MYSQL_USER`, `MYSQL_PASSWORD` from `.env`, set in `compose.yaml`;
  `docker/mysql/init/01-init.sh` (runs once on an empty volume) creates database `demo` and grants the user.
- App DB config reads env `DB_HOST=mysql`, `DB_NAME=demo`, `DB_USER`, `DB_PASSWORD` via `getenv()`; no hard-coded credentials.
  Which database the emulator uses is open (docs/architecture/technical.md §6).
- Change the environment through `compose.yaml`, `docker/**` and `.env.example`; new variables go into `.env.example`.

## Commands

```bash
cp .env.example .env                                 # first time: set passwords and COMPOSER_GITHUB_TOKEN
docker compose up -d --build                         # start nginx, php-fpm, php-cli, mysql, rabbitmq, emulator-queue-worker
docker compose exec -w /app/demo php-cli composer install         # install dependencies
docker compose exec -w /app/demo php-cli php yii migrate          # apply migrations (host + modules)
docker compose exec -w /app/emulator php-cli php yii migrate      # emulator migrations
docker compose exec -w /app/demo php-cli php yii migrate/create 'app\\modules\\<id>\\migrations\\CreatePostTable'
docker compose exec -w /app/demo php-cli vendor/bin/phpunit       # run tests
docker compose exec -w /app/demo php-cli vendor/bin/phpstan analyse     # static analysis (docs/architecture/static-analysis.md)
docker compose exec -w /app/emulator php-cli vendor/bin/phpstan analyse # same, emulator
docker compose exec mysql mysql -uroot -p demo       # MySQL shell
docker compose logs -f emulator-queue-worker         # watch the delayed-callback consumer (docs/architecture/flow.md §6a)
```

Run all PHP/Composer/git commands inside `php-cli`; PHP is not installed on the host.
API URL: `http://demo.dev` (port 80); emulator: `http://emulator.dev:81` (both need hosts-file entries).

## Host application rules

Guide-backed (rest-quick-start, rest-authentication, rest-routing):
- Stateless API: `user` component has `enableSession => false`, `loginUrl => null` (403 instead of a login redirect).
- `request` component: `parsers` has `application/json => yii\web\JsonParser`.
- REST actions return data (no views); format comes from content negotiation (JSON/XML).
- `urlManager`: `enablePrettyUrl => true`, `enableStrictParsing => true`, `showScriptName => false`.
- Identity class implements `findIdentityByAccessToken()`; authorization via `checkAccess()` / RBAC.

Project decisions:
- Modules live in `modules/<id>/` of the application and are registered in its config: `config/web.php` `modules` (class)
  and `bootstrap` (the module adds its URL rules in `bootstrap()`), `config/console.php` `migrationNamespaces`.
- `migrate` console controller is declared in `controllerMap` with an explicit `class`; module migration namespaces are
  added to `migrationNamespaces`.
- Never edit `vendor/`.

## Modules (`demo/modules/`, `emulator/modules/`)

Each remote service is integrated by one **Yii2 module inside the application** - not an external package, no separate
repository; module code is committed with the app.

- API module: `demo/modules/<id>/`, namespace `app\modules\<id>`. Emulated service: `emulator/modules/<id>/` in the
  emulator application, **same id**, own classes (separate bounded context - nothing is shared with `demo/`).
- The module id is the directory name, the namespace segment, the first URL segment (`/<id>/v1/init`) and the service
  `name` in table `service`: `[a-z][a-z0-9_]*` (no `-`, it is a namespace segment).
- A module touches host files only to register itself (`config/web.php`, `config/console.php`); it never edits host code
  (`BaseController`, `domain/process`, ...), and one module never uses another module's classes.

## Module architecture (mandatory for every module)

Each module is a Yii2 *module* inside the application (`demo/modules/<id>/`; the emulated service the same way in
`emulator/modules/<id>/`):

```
demo/modules/<id>/                namespace app\modules\<id>
    Module.php               extends yii\base\Module, implements yii\base\BootstrapInterface (URL rules, DI bindings)
    controllers/             REST controllers (namespace app\modules\<id>\controllers) - interface layer, delegate only
    application/             use cases, commands, results
    domain/                  pure PHP: value objects, entities, aggregates, repository interfaces, domain services/events
    infrastructure/          ActiveRecord, repository implementations, remote-service client (anti-corruption layer)
    migrations/              namespaced migrations (app\modules\<id>\migrations)
demo/tests/Unit/modules/<id>/     unit tests (domain, application with fakes); functional tests against the emulator
```

Inside this frame a module follows the **DDD layers** and all code follows **SOLID** - see "Code design" below.

Guide-backed rules (structure-modules, concept-configurations, rest-*; details in the `yii2-*` skills):

1. The module class `app\modules\<id>\Module` is registered in the application config: `'modules' => ['<id>' => ['class'
   => \app\modules\<id>\Module::class]]` and `'<id>'` in `'bootstrap'` (`config/web.php`); classes autoload through the
   application's `app\` alias, no Composer entry.
2. **URL rules are added at bootstrap** (`Module::bootstrap()`, the module is listed in the app's `bootstrap`), not in
   `Module::init()` — the module is initialised after routes are parsed. Wrap the rules in `yii\web\GroupUrlRule`; REST rules use `yii\rest\UrlRule`.
3. Controllers extend the host's abstract `app\controllers\BaseController` (extends `yii\rest\Controller`) — it adds the CORS filter before the authenticator and leaves `OPTIONS` unauthenticated.
   `BaseController` implements the two standard requests of the flow: `actionInit()` and `actionCallback()` (`POST`): take the
   request data, validate it, resolve the service from the module id (table `service`; missing → 500), save the record in
   table `process` (on init with status `init`, before `doProcess()`), delegate to the abstract `doProcess()`. A module
   controller implements **only** the three abstract methods `doProcess(string $type, Process $process, array $data): array`,
   `getExternalId(array $data): string` (process id in a callback body; the base finds the record by the module's service and
   this id, 404 if none - external ids are unique per service) and
   `getCallbackStatus(array $data): string` (our status `success|process|fail` - never `init` or `error`; the base saves it
   for the process when it differs from the current one; if the module fails - throws, sets a status it may not set, leaves
   the process in `init` after init, or assigns an external id its service already uses - the base saves `error` and
   answers 500) and does **not** override `behaviors()` / `verbs()` or define `actionInit()` / `actionCallback()`
   (authentication method undecided — see the open decisions in CLAUDE.md). `Process` is the host's **domain entity**
   `app\domain\process\Process` (not ActiveRecord): the module sets the external id and status through its methods
   (`assignExternalId()`, `changeStatus()`); the base saves it through `ProcessService` (skill `init-api`).
   Class name = `V<N>Controller` or singular resource; URL rules use `pluralize => false` for `v1`.
4. Resources define `fields()` / `extraFields()`; never expose password hashes, tokens or auth keys.
5. Validation in `rules()`; failed validation yields 422; throw HTTP exceptions for other errors.
6. Do not assume a fixed module ID or `Yii::$db`; use `Module::getInstance()` and `$this->get('db')` so the host can
   override components.
7. Migrations live in the module: DBMS-portable, no Active Record inside, `safeUp()/safeDown()`, namespaced
   (`app\modules\<id>\migrations\M<YYMMDDHHMMSS><Name>`), namespace listed in `migrate.migrationNamespaces` of
   `config/console.php` (API: history `migration`; emulator: history `emulator_migration`).
8. API versions: a module per major version (`v1`, `v2`), minor versions via the `Accept` header (rest-versioning).

Project conventions (not from the guide; change only after asking): the module's `bootstrap()` is its composition root
(URL rules and DI bindings of its interfaces); registering a module means exactly the three config entries above; module
tests live in `tests/Unit/modules/<id>/` of the application.

**Service registration (mandatory):** every module ships a namespaced migration `M<YYMMDDHHMMSS>RegisterService` that
inserts its own row into the host's table `service` - `insert('{{%service}}', ['name' => '<module-id>', 'created_at' =>
time(), 'updated_at' => time()])` in `safeUp()`, `delete('{{%service}}', ['name' => '<module-id>'])` in `safeDown()`. The
name is the module id (the first segment of its URLs), which the host uses to resolve the service of every init and
callback request; without the row these requests answer HTTP 500. External ids of a module's processes are unique within its
service only.

**Signing (only for a module whose remote service requires it, CLAUDE.md "Decided"):** the same `RegisterService`
migration also sets `api_key` / `secret_key` on its `service` row (columns added once, host migration
`add_service_signature_keys`; nullable - unsigned modules leave them `null`), reading the values from env vars
(`insert()` with `getenv('<MODULE>_API_KEY')` / `getenv('<MODULE>_SECRET_KEY')`, never a literal secret in the
migration file or in `development/<name>/specs/`). The module signs its remote request with
`hash_hmac('sha256', $rawJsonBody, $secretKey)`, sent as header `X-Signature`, with `X-Api-Key` identifying the
service; the emulator looks the pair up (its own copy, `module.service.yaml` env var names) to verify.

## Code design (mandatory for generated and written code)

Full rules: `docs/architecture/code-design.md`. Procedure: skill `code-generation`; review: skill `design-review`.

- **SOLID** plus DRY, KISS, YAGNI, composition over inheritance and the Law of Demeter for every class (skill `solid-principles`).
- **Domain-Driven Design in modules** (skill `ddd-architecture`): one module = one bounded context; the project glossary
  (ubiquitous language) is used verbatim in names; the remote-service adapter is the anti-corruption layer; layers
  `controllers` → `application` → `domain` ← `infrastructure`, with `Bootstrap` as the composition root (DI bindings).
- `domain/` and `application/` never use Yii, `Yii::$app`, ActiveRecord or infrastructure classes; ActiveRecord stops at
  infrastructure; the host's `Process` entity stops at the module controller (it is not passed into module use cases).
- **DDD with Yii2** (`docs/architecture/ddd-yii2.md`, rule `.claude/rules/ddd-yii2.md`): Yii2 is only the delivery and
  infrastructure mechanism. Entities are plain PHP objects, never ActiveRecord; ActiveRecord is a persistence model used only
  inside repository implementations; controllers are thin and call application services; dependencies come through
  constructors from `yii\di\Container`, bound in the module's `bootstrap()` (host: `config/web.php` `container`), never from `Yii::$app`.
- The host `demo/` stays thin: only the process tracking (`domain/process`, `application/process`,
  `infrastructure/persistence`) and `BaseController`. The emulator has the same small structure for `EmulatorProcess`; more
  layers only when an emulated service gets real logic.
- Simplicity first: no layer, interface, event or factory without a current job.
- Generated code is checked by a separate `design-review` pass before it is reported as done.

## Code style

- PSR-12 / Yii2 coding standard (`yiisoft/yii2-coding-standards`); follow the surrounding code's style.
- Typed properties/params where Yii allows; short array syntax; `::class` instead of class-name strings.
- Comments only for non-obvious "why". Public API of a module is documented in its README.

## Skills (`.claude/skills/`)

| Skill | Use when |
|-------|----------|
| `init-project` | first-time setup: `docker-build` → `yii-clone-install` + `yii-prepare` into `tmp/yii-skeleton` → `init-api` → `init-emulator` → remove the temporary skeleton |
| `docker-build` | build/start docker compose (nginx 80/81, php-fpm, php-cli, mysql) and verify it |
| `yii-clone-install` | create the Yii2 basic skeleton with vendors (built in the container's `/tmp`, copied to `<dir>`; `init-project` uses `tmp/yii-skeleton`) |
| `yii-prepare` | delete the default controllers, models, commands, assets, views, widgets of the skeleton in `<dir>` and fix the config |
| `init-api` | API `demo/`: copy the prepared skeleton, own cookie key in `.env` (`DEMO_COOKIE_VALIDATION_KEY`), DB and REST host config, then the code by `generate-api` (process tracking by the DDD/Yii rules, `BaseController`, migration `init_process`) |
| `generate-api` | generate the API code in `demo/` from its layer specs (`.claude/skills/generate-api/specs/01-domain`, `02-application`, `03-infrastructure`, `04-interface`): process tracking, `BaseController`, migration, container wiring, unit tests; checks per layer + `design-review` (run by `init-api`) |
| `init-emulator` | emulator `emulator/`: copy the prepared skeleton, own cookie key in `.env` (`EMULATOR_COOKIE_VALIDATION_KEY`), DB config + own migration history (`emulator_migration`), then the code by `generate-emulator` |
| `generate-emulator` | two parts. Part A (run by `init-emulator`, its layer specs `.claude/skills/generate-emulator/specs/01-04`): `EmulatorProcess` by the DDD/Yii rules, migration `init_emulator_process`, container wiring, unit tests; checks per layer + `design-review`. Part B (stage 2b of adding a module, run per module from its specs): generate the emulated-service code in `emulator/modules/<id>/` (own bounded context, plays the remote service per the `EMU-n` requirements, schedules the callback with a 5-second RabbitMQ delay to the `callback_url` it received); checks per layer + `design-review` |
| `init-log` | step logging of the initiation skills into `logs/init_<timestamp>/log_<skill name>.log`; JSON lines: action, start_time, end_time, execution_time |
| `create-module` | **entry point of adding a whole module**: turns what the user knows about a new remote-service integration into specs - `development/<name>/specs/module.yaml`, `module.service.yaml`, `module.service.md`, `module.tests.md` (templates in `.claude/skills/create-module/templates/`; the spec step writes no code) - then runs `generate-module` (host code), `generate-emulator` Part B (emulated side) and finally `test-module` |
| `generate-module` | stage 2a: generate the host code of one module in `demo/modules/<id>/` from its specs (`Module.php`, `V1Controller`, DDD layers building the remote-service request with `callback_url`, status mapping, `RegisterService` + extra-table migrations, unit tests); checks per layer + `design-review`; started by `create-module` (stage 2b, the emulated side, is `generate-emulator` Part B, listed above) |
| `yii2-fundamentals` | any Yii2 code: application, config, DI, controllers, models, request/response, routing, errors |
| `yii2-data-layer` | Active Record, Query Builder, validation |
| `yii2-rest-endpoint` | resources, REST controllers, routing, formats, filtering, versioning |
| `yii2-rest-security` | authentication, authorization/RBAC, rate limiting, CORS, error handling |
| `yii2-migrations` | database schema changes: create/apply migrations, migrate config, namespaced/separated histories |
| `yii2-guide-lookup` | topic → page of the official guide when a fact is missing from the skills |
| `code-generation` | writing/generating PHP code: design (DDD) → layers → code (SOLID) → tests → self-check → `design-review` |
| `solid-principles` | SOLID + DRY/KISS/YAGNI/composition/Demeter rules and checklist for any PHP class |
| `ddd-architecture` | module design: bounded context, ubiquitous language, layers, building blocks, `BaseController` boundary |
| `design-review` | read-only review of code against the code-design rules (separate checker pass) |
| `phpstan` | run PHPStan static analysis on `demo/`/`emulator/` and act on findings (types/reachability/nullability - a different check than `design-review`); `docs/architecture/static-analysis.md` |
| `analyze-code` | read-only: runs `design-review` + `phpstan` together, writes a combined checkbox report `development/analize_<start_ts>_<check_ts>.md` |
| `fix-code` | fixes the problems a checklist report lists (`analyze-code`'s or `test-module`'s), re-checks (loop, max 5 iterations), maintains `development/backlog/` (still open) and `development/complete/` (resolved, with the fix description) |
| `test-module` | stage 3 of adding a module - run by `create-module` once both sides (host code, `generate-emulator` Part B) exist, or on its own for an existing module: builds (or checks and updates) the module's own test spec `development/test/<name>/module_<name>.md` from the base categories (`.claude/skills/test-module/specs/module-test-base.md`) + the module's status map and error codes, actually runs it against the live stack (init, callback, every status change, every final status and error code), then loops with `fix-code` (max 5 iterations) until clean or the limit |
| `yaml-read` | read/summarize any YAML file of the project (`compose.yaml`, application and module configs) without changing it |
| `yaml-write` | create/edit a YAML file: change entries, keep structure, comments and references, verify it parses |
| `yaml-analyze` | audit a YAML file: syntax, type pitfalls, uniqueness, references, schema of known formats, secrets |

## Documentation (`docs/`)

Project documentation lives in `docs/`: `project/` (brief project description), `architecture/` (`overview.md`, `technical.md`, `flow.md`, `code-design.md`, `ddd-yii2.md`), `api/` (main API, endpoint list), `modules/` (module
architecture, lifecycle, the modules of both apps); each directory has a `README.md`; index in `docs/README.md`. Update the matching document when the
environment, an endpoint or a module changes.

## Reference

Yii2 guide (only source): `https://www.yiiframework.com/doc/guide/22.0/en`. Load the matching `yii2-*` skill before
writing Yii code; fetch the guide page (see `yii2-guide-lookup`) for anything not covered.
