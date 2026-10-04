# Modules

Each remote service is integrated by one **Yii2 module inside the applications** (not an external package): the API module in
`demo/modules/<id>/`, and the matching emulated service in `emulator/modules/<id>/` with the same id. Module code is committed
with the application.

## 1. Module id

The module id is the directory name, the PHP namespace segment and the first URL segment (`/<id>/v1/init`), and it is the
service's `name` in table `service`. Use `[a-z][a-z0-9_]*` (no `-`: it is a namespace segment).

## 2. Layout - API module (`demo/modules/<id>/`)

```text
demo/modules/<id>/                namespace app\modules\<id>
    Module.php           extends yii\base\Module, implements yii\base\BootstrapInterface: bootstrap() adds the URL rules
                         (GroupUrlRule, prefix <id>) and binds the module's interfaces in the DI container (composition root)
    controllers/         V1Controller extends app\controllers\BaseController; converts and delegates only
    application/         use cases, commands, results
    domain/              pure PHP: value objects, entities, aggregates, repository interfaces, domain services/events
    infrastructure/      ActiveRecord, repository implementations, remote-service client (anti-corruption layer)
    migrations/          namespaced migrations app\modules\<id>\migrations (M<YYMMDDHHMMSS><Name>)
demo/tests/Unit/modules/<id>/     the module's unit tests (domain, application with fakes)
```

Layers, dependency rule and building blocks: [../architecture/code-design.md](../architecture/code-design.md).

Registration in the application (the only host files a module touches):
- `demo/config/web.php`: `'modules' => ['<id>' => ['class' => \app\modules\<id>\Module::class]]` and `'<id>'` in `'bootstrap'`
  (URL rules must exist before routing, so the module bootstraps).
- `demo/config/console.php`: `'app\modules\<id>\migrations'` in `controllerMap.migrate.migrationNamespaces`.

## 3. Layout - emulated service (`emulator/modules/<id>/`)

The same layout in the emulator application (namespace `app\modules\<id>` of the emulator; own bounded context - nothing is
shared with `demo/`). Registered in `emulator/config/web.php` (`modules`, `bootstrap`) and its migrations in
`emulator/config/console.php` `migrationNamespaces` (history `emulator_migration`). Its endpoints play the remote service
(flow: [../architecture/flow.md](../architecture/flow.md) §6).

## 4. Rules

- URL rules are added in `Module::bootstrap()` inside a `GroupUrlRule`, with `pluralize => false` for `v1`.
- Controllers implement only `doProcess()`, `getExternalId()` and `getCallbackStatus()`; behaviors and the actions `init` and
  `callback` live in `BaseController` (take the data, validate, save the process record, delegate to `doProcess()`).
- Migrations: portable, `safeUp()/safeDown()`, namespaced; the default `Init` migration creates tables `<id>` and
  `<id>_data`.
- **Service registration:** a migration `M<YYMMDDHHMMSS>RegisterService` inserts the module's row into the host's table
  `service` (`name` = the module id, `created_at`, `updated_at`) in `safeUp()` and deletes it in `safeDown()`. The host resolves
  the service of every init and callback from the module id in the URL; without the row both answer HTTP 500. External ids
  are unique per service.
- Do not hard-code the module id or `Yii::$db` (use `Module::getInstance()` / the module's components).
- Module code stays inside `modules/<id>/`; it never edits host code (`BaseController`, `domain/process`, ...), and one
  module never uses another module's classes.
- Resources define `fields()` / `extraFields()` and never expose secrets.

Full rules: "Module architecture" in `AGENTS.md`.

## 5. Standard requests

Every module implements (flow: [../architecture/flow.md](../architecture/flow.md)):

1. **Init process** - takes the data of the API request, builds the body of the remote-service request from it and sends it
   (to the emulator in tests). The body also carries `callback_url` - the module's own callback endpoint
   (`http://demo.dev/<id>/v1/callback`), added by the module, not taken from the init request (flow §1a). The init response
   has `status` (`success` | `process` | `fail`), mapped from the remote response.
2. **Callback** - only for services that send callbacks: receives the result or error from the remote service and reports
   it to the API, which updates the process record. A service without callbacks returns the final result in the response of
   the init request.

Remote statuses can be complex; each module maps them to our three statuses (`success`, `process`, `fail`) per service
method, and builds the body of the request to the service from the init request data. The statuses `init` and `error` are
never returned by a module: the host records a process with `init` before `doProcess()` runs and sets `error` when the module
fails (throws, reports a status it may not set, or leaves the process in `init`).

## 6. Lifecycle

Creating a new module is two stages, each its own skill:

1. **Describe it** — skill `create-module`. Tell it the module name, its requests, and how it talks to the remote
   service (init `data` parameters, service methods, remote request/response, status mapping, whether it sends
   callbacks); it asks once for anything missing and writes four files to `development/<name>/specs/`: `module.yaml`
   (identity, API requests, migrations), `module.service.yaml` (the remote service, its methods, data/status mapping),
   `module.service.md` (readable flow + examples + emulator requirements) and `module.tests.md` (unchecked test
   checklist). Writes specs only - no code.
2. **Generate the code** — two skills read the same specs and generate independently (own bounded contexts):
   - `generate-module`: from the module name, generates `demo/modules/<id>/` - `Module.php` (registers itself and its
     `init`/`callback` routes in its own `bootstrap()`, no separate `Bootstrap.php`), `V1Controller`, the DDD layers
     that build the request to the remote service (always adding `callback_url`, flow.md §1a) and map its statuses, the
     mandatory `RegisterService` migration and any of the module's own tables, and unit tests.
   - `generate-emulator` **Part B** (the same skill that builds the emulator's own process tracking, Part A): from
     `module.service.yaml`, generates the matching `emulator/modules/<id>/` that plays the remote service per the
     `EMU-n` requirements of `module.service.md` §9, scheduling the callback with a fixed 5-second RabbitMQ delay
     (flow.md §6a) to the `callback_url` it received in the request.
   Both register the module (`modules`/`bootstrap` in `config/web.php`, the migration namespace in `config/console.php`
   of their own application) and apply their migrations (`php yii migrate`) as part of generation.

Manual registration/migration (only if generating by hand instead of via the skills): add the module to `modules` and
`bootstrap` in `config/web.php` and its migration namespace to `config/console.php` of each application, then
`php yii migrate` in `demo/` and in `emulator/`; check that `service` lists the module id after the `demo/` migration.

## 7. Modules

| Module id | API (`demo/modules/`) | Emulator (`emulator/modules/`) | Description |
|-----------|-----------------------|-------------------------------|-------------|
| `test` | done | not generated yet | Demo/proof-of-concept module, two identical-shape service methods (`service_1`/`service_2`), signed requests (HMAC-SHA256). Specs: `development/test/specs/`. |

## 8. Module documentation template

Copy for each module (or place in `modules/<id>/README.md`):

```markdown
## <id>
Namespace / id:
Purpose:
Endpoints (link to docs/api/README.md):
Tables and models:
Configuration:
Emulated service (emulator/modules/<id>):
```

## 9. Open items (TODO)

- Code for requests beyond `init` / `callback`.
