# Architecture overview

A brief description of how the system is built. Details: [technical.md](technical.md) (environment, hosts, database) and
[flow.md](flow.md) (requests, statuses, sequences).

## 1. Building blocks

```text
                    +------------------------------ Docker Compose ------------------------------+
                    |                                                                             |
client ---HTTP----> |  nginx :80 --> php-fpm --> API host app (demo/)  ---- modules (vendor/) ---+ |
                    |                                |                    one per remote service | |
remote service ---> |  (callbacks to the API)        |                                          | |
   or emulator      |  nginx :81 --> php-fpm --> Emulator (emulator/)                           | |
                    |                                |                                          | |
                    |                            MySQL 8, database `demo`                       | |
                    +-----------------------------------------------------------------------------+
```

| Block | Technology | Responsibility |
|-------|------------|----------------|
| nginx | nginx | two hosts: `demo.dev` (API, port 80) and `emulator.dev` (emulator, port 81); passes PHP to php-fpm |
| API host (`demo/`) | Yii2 (`yii\rest`), PHP 8.3 | validates requests, keeps the process record, routes the two standard requests to the module, CORS |
| Modules (`demo/modules/<id>/`, `emulator/modules/<id>/`) | Yii2 modules inside the applications | everything specific to one remote service: the request to it, status mapping, callback handling |
| Emulator (`emulator/`) | Yii2 | plays the remote services: validates the module's request, saves its own process data, answers, sends callbacks |
| MySQL | MySQL 8, database `demo` | tables `process` (API) and `emulator_process` (emulator), plus the migration histories |
| php-cli | PHP 8.3 CLI, Composer, git | all commands: Composer, `php yii`, tests |

## 2. The API host and its modules

- The host is deliberately thin. Its shared parent controller, `BaseController`, adds the CORS filter and
  implements **both standard requests** for every module: take the data, validate it, create (init) or find (callback) the record in
  `process`, delegate to the module, save the record.
- A module is a Yii2 module inside the application, `demo/modules/<id>/` (namespace `app\modules\<id>`), with the same
  layout everywhere: `Module` (adds its URL rules `POST /<id>/v1/init`, `POST /<id>/v1/callback` in `bootstrap()`),
  `controllers/V1Controller`, the DDD layers `application/`, `domain/`, `infrastructure/`, and `migrations/`. It is registered
  in `config/web.php` (`modules`, `bootstrap`) and `config/console.php` (`migrationNamespaces`). Its controller implements only
  three methods: `doProcess()`, `getExternalId()`, `getCallbackStatus()`.
- The emulated service of a module lives in `emulator/modules/<id>/` with the same id, registered the same way in the emulator.

## 3. Request flow in one paragraph

The client sends `POST /<module>/v1/init`. The base controller validates the body and creates a `process` record. The module sends the
request to the remote service (in tests: to the emulator) and maps the service's answer to `success`, `process` or `fail`; the API
answers with that status. If the service continues the work, it later sends `POST /<module>/v1/callback`; the base controller finds the
record by the service's process id and saves the mapped status whenever it differs from the current one. Services without callbacks
return the final result in the first answer. If the module fails with an exception, the API saves the status `error` and answers 500. Sequences: [flow.md](flow.md).

## 4. Data

| Table | App | Content |
|-------|-----|---------|
| `service` | API | `name` (unique; the module id), timestamps - one row per module, inserted by the module's `RegisterService` migration and removed by its down-migration |
| `process` | API | `service_id` (→ `service`), `request_id` (unique), `service_method`, `external_id` (unique per service), `incoming_data`, `status`, timestamps |
| `emulator_process` | emulator | `service_method`, `process_id`, `status`, timestamps |
| `migration`, `emulator_migration` | API, emulator | migration histories (separate, because the database is shared); the modules' migrations (namespaces listed in each app's `migrationNamespaces`) use the API history |
| module tables | modules | whatever the module needs (the default `Init` migration creates `<name>` and `<name>_data`) |

## 5. How work is organised

| Layer | Where | Purpose |
|-------|-------|---------|
| Rules | `AGENTS.md`, `CLAUDE.md` | project rules for AI agents; Yii2 facts only from the official guide |
| Skills | `.claude/skills/` | `init-project` (with `docker-build`, `init-api`, `init-emulator`), YAML skills (`yaml-read`, `yaml-write`, `yaml-analyze`), Yii2 reference skills |
| Logs | `logs/` (git-ignored) | step logs of the initiation skills |
| Docs | `docs/` | project, architecture, API, modules |

## 6. Key decisions

- Thin host plus modules inside the application (`demo/modules/<id>/`, emulated in `emulator/modules/<id>/`), one module per
  remote service, identical architecture.
- One request body and one process status model for all services.
- Callbacks are optional per service; the module handles both cases.
- Statuses are mapped per service method in the module, not in code shared by all modules.
- The emulator is a separate application in the same stack and database (own tables and migration history), so module tests run without a
  real service.
- `demo/` and `emulator/` are plain directories of this repository (no submodules); module code lives in `modules/<id>/` of each application and never changes host code.
- HTTP only in the local environment (ports 80 and 81).

## 7. Open points

Authentication method of the API; signature algorithm for requests to services; how a test selects the emulator scenario; the callback
URL known to the remote service; whether the emulator gets its own database.
