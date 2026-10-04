---
name: generate-emulator
description: Generate the emulator's code in emulator/ - two parts. Part A (layer specs in specs/01-04, run once by init-emulator): the emulator's own process tracking (EmulatorProcess entity, EmulatorStatus, value objects, repository interface, ActiveRecord persistence model and repository, container wiring, init_emulator_process migration in the emulator_migration history). Part B (run per module, from a module's own specs written by create-module): the emulated-service code of one module in emulator/modules/<id>/ - Module.php, a V1Controller playing the remote service's endpoints, the domain/application/infrastructure layers (request validation, response building, a 5-second RabbitMQ-delayed callback to the callback_url received), migrations, and unit tests. Use Part A when emulator/ has the prepared skeleton but not its own process tracking; use Part B after create-module has produced a module's specs and that module's emulated side does not exist yet (or to regenerate/check either part against its specs).
---

# Generate emulator code (`emulator/`)

Two parts, run at different times, sharing the same rules and review procedure. The specs are the source of truth: read
the relevant spec/section completely before writing its files, and generate exactly what it describes - names,
signatures, behaviour, messages, tests. Anything a spec does not say is decided by the project rules (`AGENTS.md`,
`docs/architecture/code-design.md`, `docs/architecture/ddd-yii2.md`, rule `.claude/rules/ddd-yii2.md`,
`docs/modules/README.md`) and the `yii2-*` skills - never by memory. If a spec and a rule contradict each other, stop
and ask the user. Procedure follows skill **`code-generation`**; review by **`design-review`** (fresh subagent, maker ≠
checker).

The emulator is a separate Yii application and a separate bounded context (it plays the remote service): its code is
**never copied from or shared with `demo/`**, even where the shapes are similar - build a module's emulated side (Part
B) from that module's own specs, not by reading the API module's code.

Run from the repository root; PHP commands inside `php-cli` (`MSYS_NO_PATHCONV=1 docker compose exec -T -w /app/emulator
php-cli ...` in Git Bash).

---

# Part A - the emulator's own process tracking (once, run by `init-emulator`)

Generated from the layer specs in `.claude/skills/generate-emulator/specs/`.

| Spec | Layer | Files now |
|------|-------|-----------|
| `specs/01-domain.md` | domain | `emulator/domain/process/` (7 files) + `tests/Unit/domain/process/EmulatorProcessTest.php` |
| `specs/02-application.md` | application | none - always empty here; per-module application code is Part B, generated into `emulator/modules/<id>/application/`, never into `emulator/application/` |
| `specs/03-infrastructure.md` | infrastructure | `emulator/infrastructure/persistence/` (2 files), migration `init_emulator_process`, `container` wiring in `config/web.php` |
| `specs/04-interface.md` | interface | none - always empty here; per-module controllers are Part B, generated into `emulator/modules/<id>/controllers/`, never into `emulator/controllers/` |

## Logging (Part A)
Log every step with skill **`init-log`** into `<log dir>/log_generate-emulator.log` (JSON line: `action`, `start_time`,
`end_time`, `execution_time`). Use the log dir you were given (e.g. by `init-emulator`); if started on your own, create one
(`bash .claude/skills/init-log/init-log.sh start`).
Steps to log: `check preconditions`, `compare with specs`, `generate domain`, `check domain`, `check application (empty)`,
`generate infrastructure`, `yii migrate`, `check infrastructure`, `check interface (empty)`, `unit tests`, `design-review`.
A failed step is logged as `FAILED: <action>`.

## A.1 Preconditions
- `emulator/vendor/autoload.php` exists and `php yii help` runs in `emulator/` (the prepared skeleton, copied by
  `init-emulator`); else stop and name the missing step (`init-emulator` §2).
- `config/db.php` reads the environment and `config/console.php` maps `migrate` with `migrationTable` =
  `{{%emulator_migration}}` (`init-emulator` §3); else stop - never run the emulator's migrations into the API's history.
- The stack is up and MySQL is healthy (`docker-build`).

## A.2 Compare with the specs
For every file of the table above: missing → it will be generated; present and equal in substance → keep; different →
**never overwrite**: list the differences and ask the user. Show the list (to generate / keep / differs) before writing.

## A.3 Generate layer by layer (inside out)
For each spec in the order 01 → 02 → 03 → 04:
1. Read the spec completely.
2. Write the files it lists (only the missing ones or those the user agreed to regenerate), then the layer's test file.
   Specs 02 and 04 list no files: run only their checks (their content now only cross-references Part B below - the
   per-module work they used to describe as "coming later" has its own home there, not in `emulator/application/` or
   `emulator/controllers/`).
3. Run the layer's checks from the spec, and `php -l` on every written file:
   ```bash
   MSYS_NO_PATHCONV=1 docker compose exec -T -w /app/emulator php-cli php -l <file>
   ```
4. Continue only when the checks pass.

Layer specifics:
- **03:** before migrating, note the rows of the API's `migration` table; create the migration only if none creates
  `{{%emulator_process}}` yet; `php yii migrate --interactive=0` **in `emulator/`**; then compare `migration` again (unchanged)
  and check `emulator_migration`. If the table `emulator_process` already exists without a matching history row, stop and ask
  the user (never drop or alter tables on your own).
- **03 wiring:** edit `config/web.php` with a minimal `Edit` (add the `container.singletons` entry); keep everything else.

## A.4 Verify
- The full unit suite (the skeleton's default tests are removed by `yii-prepare`):
  ```bash
  MSYS_NO_PATHCONV=1 docker compose exec -T -w /app/emulator php-cli sh -c 'vendor/bin/codecept build >/dev/null; vendor/bin/codecept run Unit --no-colors'
  ```
  All green; report the real counts.
- All layer checks again (01-04); `http://emulator.dev:81/` answers 404 from Yii.

## A.5 Independent review
Run skill **`design-review`** on the generated files in a separate pass - a subagent that did not write the code (maker ≠
checker). Fix its errors; fix warnings or explain why they are accepted; send the fixes back for a re-check. If a fix changes
behaviour a spec describes, **update the spec in the same step** so spec and code stay equal.

## A.6 Report
Files generated / kept / differing (per layer), migration, table and history table, check and test results, review verdict
with what was fixed, spec changes, and open questions (signature algorithm, emulator scenario selection, emulator
database - CLAUDE.md).

## A Rules
- The specs are the source of truth: code that deviates from them is either fixed or the spec is updated with the user's
  consent - never silently different.
- Never overwrite an existing file without the user's consent; never edit `vendor/`; never drop or alter database tables; never
  write to the API's tables or its `migration` history.
- No new Composer dependency without the user's approval.
- Nothing that CLAUDE.md lists as an open decision is decided here; per-module application services and controllers are
  Part B, not this part.

---

# Part B - one module's emulated service (`emulator/modules/<id>/`, per module)

Stage 2b of "creating a new module" (emulator side; the host side is `generate-module`, `docs/modules/README.md`
"Lifecycle"). Reads `development/<name>/specs/module.service.yaml` and `module.service.md` (§9 "Emulator
requirements", `EMU-n`) as the source of truth for data and behaviour.

Input: the module name (`<name>` = `<id>`). Read `module.service.yaml` and `module.service.md` §9/§9.1 with `yaml-read`
/ direct read before generating anything; `module.yaml` is not needed (the emulator never sees the host's requests).

## Logging (Part B)
Log every step with skill **`init-log`** into `<log dir>/log_generate-emulator-<name>.log` (same JSON-line format as
Part A); create a log dir of your own if not given one. Steps: `check preconditions`, `read specs`, `generate
domain`, `check domain`, `generate infrastructure`, `yii migrate`, `check infrastructure`, `generate interface`, `check
interface`, `register module`, `unit tests`, `design-review`. A failed step is logged `FAILED: <action>`.

## B.1 Preconditions
- Part A is done: `emulator/domain/process/EmulatorProcess`, `emulator/infrastructure/persistence/*` exist - else stop,
  this part never creates that host-of-the-emulator code, only module code.
- `development/<name>/specs/module.service.yaml` exists and passes `yaml-analyze` with no errors; `module.service.md`
  §9/§9.1 exists (written by `create-module`) - else stop and name what is missing.
- `emulator/modules/<id>/` does not exist yet. If it does, compare against the specs (A.2's rule): missing →
  generate; equal in substance → keep; different → never overwrite, list differences, ask.
- The queue infrastructure this part relies on (docs/architecture/flow.md §6a): `rabbitmq` and `emulator-queue-worker`
  are Compose services (`docker-build`), and the PHP image needs `ext-sockets`/`ext-bcmath` (`docker/php/Dockerfile` -
  required by `php-amqplib`; without them `composer require` fails to resolve). **Already done, confirmed working**
  (verified end-to-end: a job published with `delay(5)` was delivered to `emulator-queue-worker` ~5s later) - do not
  repeat these steps, only add a module's own job class (B.3.2):
  1. `composer require yiisoft/yii2-queue enqueue/amqp-lib` in `emulator/` (`php-cli`) - done by `init-emulator` §3.
  2. `emulator/config/queue.php` (a `queue` component config shared by `web.php` and `console.php`): class
     `yii\queue\amqp_interop\Queue`, `host`/`port`/`user`/`password`/`vhost` from `RABBITMQ_*` env
     (`docs/architecture/technical.md` §3), `queueName` = `emulator_callbacks`, `exchangeName` =
     `emulator_callbacks_exchange`. **No delay-strategy config needed**: `yii\queue\amqp_interop\Queue::open()` sets
     `Enqueue\AmqpTools\RabbitMqDlxDelayStrategy` automatically whenever the context supports it - this already is
     TTL + dead-letter exchange, no plugin, and the driver declares its own topology in `setupBroker()` (called
     automatically on push/listen) - never hand-roll the exchange/queue declarations.
  3. `queue.php` is required from both `emulator/config/web.php` (`components.queue`, to **publish**:
     `Yii::$app->queue->delay(5)->push($job)`) and `emulator/config/console.php` (`components.queue` **and** listed in
     `bootstrap` - `yii\queue\cli\Queue::bootstrap()` self-registers the console command from the component's own id,
     so naming the component `queue` gives the command `queue/listen`, already what `emulator-queue-worker` runs; no
     separate `controllerMap` entry is needed).

## B.2 Layout generated

```text
emulator/modules/<id>/                         namespace app\modules\<id> (emulator's own, unrelated to demo/'s)
    Module.php                           extends yii\base\Module, implements yii\base\BootstrapInterface
    controllers/V1Controller.php         extends yii\rest\Controller (no host BaseController in the emulator - it plays independent endpoints)
    application/<Method>UseCase.php      per service_methods[] entry: validate, open+save an EmulatorProcess (Part A, reused - EMU-4), build the response, schedule the callback if any
    infrastructure/queue/<Method>CallbackJob.php   yii2-queue Job (per method with a `callback` block): payload = process id + callback_url; execute() sends the callback (EMU-6)
    domain/EmulatorResponseBuilder.php   pure: builds the remote_request.response body per method (status per scenario, EMU-5)
    domain/CallbackBuilder.php           pure: builds the callback body per method (EMU-6), only for methods with a `callback` block - used by the job, not by the use case directly
    infrastructure/HttpCallbackSender.php    POSTs the callback body to a given URL (curl, no new Composer dependency) - called by the job, never by the use case
    (no migrations/, no infrastructure/persistence/ - reuses Part A's emulator_process table/repository, no `service` table on this side either)
emulator/tests/Unit/modules/<id>/domain/, application/   unit tests (fakes, no database)
```

## B.3 Generate layer by layer (inside out)

Read `module.service.yaml` and `module.service.md` §3/§6/§8/§9/§9.1 completely first; write only missing files; `php -l`
every file (`-w /app/emulator`); continue only when checks pass.

### B.3.1 Domain (`emulator/modules/<id>/domain/`)
- `EmulatorResponseBuilder`: one pure method per `service_methods[].name`, taking the `EmulatedProcessId` the use case
  already generated (via `EmulatorProcess::open()`, Part A - EMU-8's uniqueness comes from there, this layer never
  generates ids itself) and building `remote_request.response.params` for a given scenario (§9.1 of
  `module.service.md`): the id at `external_id_param`, the mapped status value at `status_param` (one of the method's
  `status_map` remote values, chosen by the scenario), and any other declared response param from its
  `example`/`default`/type sample.
- `CallbackBuilder` (only for methods with a `callback` block): builds `callback.params` for a chosen `callback.results`
  entry (`external_id_param` = the same process id, `status_param` = the matching remote status).
- No Yii, no `Yii::$app`, no ActiveRecord, no infrastructure classes.
- **Scenario selection is an open point** (`module.service.md` §10, CLAUDE.md): until decided, generate the builders to
  accept the scenario as an explicit parameter (chosen by the caller - a test, or a fixed default for manual smoke
  testing) rather than inferring it from the request; document this in the report, do not invent a selection rule.

### B.3.2 Application (`emulator/modules/<id>/application/`)
- **No new persistence for this module** - `emulator/domain/process/EmulatorProcess` and `EmulatorProcessRepository`
  (Part A) are already the generic, shared "this emulated process is running" entity, exactly the emulator's analog of
  `demo/domain/process/Process`/`ProcessRepository`: `EmulatorProcess::open(ServiceMethod)` generates a globally-unique
  `EmulatedProcessId` (128-bit random) and starts the process; `changeStatus()`/`recordPersisted()` for the rest. Every
  emulated module reuses this one entity/repository/table (`emulator_process`) - creating a second, per-module process
  table would duplicate it for no reason (YAGNI/DRY). EMU-4 is satisfied by this reuse, not by new module code.
- One use case per `service_methods[].name`: validates the request body against `remote_request.body.params` (+
  `callback_url`, required - EMU-2), checks the signature only if `remote_service.signature.enabled` (EMU-3, and only
  the presence/format the specs define - never invent an algorithm), opens an `EmulatorProcess` and - **before
  saving** - applies the chosen scenario's status to it if the scenario is final at once (no callback follows):
  `EmulatorProcess::open()` defaults to the generic "process" status, correct only for scenarios where a callback
  finishes the job later; an immediate Complete/Fail scenario must `changeStatus()` first, or the stored record
  disagrees with what the response just told the caller. Then saves via the (constructor-injected)
  `EmulatorProcessRepository`, builds the response via `EmulatorResponseBuilder` from its `EmulatedProcessId` and the
  chosen scenario status, and - only for methods with a `callback` block - **pushes**
  `<Method>CallbackJob` (the process id + the `callback_url` received in the request) onto the `queue` component with a
  5-second delay (`Yii::$app->queue->delay(5)->push($job)` - flow.md §6a) instead of sending the callback itself. The
  use case never performs HTTP I/O for the callback and never blocks on it; it only enqueues.
- `<Method>CallbackJob implements \yii\queue\JobInterface`: constructor/public properties hold the process id (string)
  and the `callback_url` (plain scalars - a queue message must serialize; never store the domain entity or a DB
  connection in it); `execute($queue)` re-reads the `EmulatorProcess` by id (via `EmulatorProcessRepository`, resolved
  from the DI container inside `execute()` since job properties must stay serializable), builds the callback body via
  `CallbackBuilder` (B.3.1), and sends it with `HttpCallbackSender::send($callbackUrl, $body)` (B.3.3). This is what the
  `emulator-queue-worker` container actually runs when the delayed message is delivered (EMU-6).
- Depends only on the domain layer (interfaces, including the shared `EmulatorProcess`/`EmulatorProcessRepository`)
  plus the `queue` component contract (`yii\queue\Queue`, `yii\queue\JobInterface`) - no ActiveRecord, no other Yii
  component, no module-owned persistence.

### B.3.3 Infrastructure (`emulator/modules/<id>/infrastructure/`)
- `HttpCallbackSender`: PHP curl POST of the callback body to the URL given at call time (no new Composer dependency) -
  used only by `<Method>CallbackJob::execute()` (B.3.2), never by the use case that handles the init request.
- **No AR persistence model, no migration** for this module - it reuses Part A's `emulator_process` table and
  `ArEmulatorProcessRepository` (already bound in `emulator/config/web.php` → `container.singletons` by Part A); adding
  a second table/repository per module would be a duplicate of existing infrastructure.
- Wiring - `emulator/config/web.php` → `container.singletons` if a binding must be host-visible, otherwise prefer the
  module's own `Module::bootstrap()` DI bindings (same preference as `generate-module` §3.3).

### B.3.4 Interface (`emulator/modules/<id>/controllers/V1Controller.php`)
- `extends yii\rest\Controller` directly (the emulator has no shared `BaseController` - each emulated module plays
  independent, service-specific endpoints, not the host's standard init/callback contract).
- **Override `behaviors()`** to `unset($behaviors['authenticator'], $behaviors['rateLimiter'])`: `yii\rest\Controller`'s
  default `rateLimiter` needs `Yii::$app->user`/`identityClass`, which the emulator never configures (no
  authentication decided, same fix `demo/controllers/BaseController.php` already applies) - every request 500s without
  this. Verified: this is a real crash, not a hypothetical one.
- One action per `service_methods[].remote_request` (method/path from the spec) taking the use case of B.3.2 via
  constructor injection; validates content type, calls the use case, returns its response body with the right HTTP
  status.
- `Module.php`: `extends yii\base\Module implements yii\base\BootstrapInterface`; `bootstrap()` adds the module's URL
  rules via `yii\rest\UrlRule` - added directly to the url manager, not nested in a `GroupUrlRule` (its `prefix` only
  rewrites `{pattern, route}`-shaped entries, which a `yii\rest\UrlRule` config is not). If the public URL has no
  version segment but the controller class does (`emulator_url` + `remote_request.path` vs. `controllers/V1Controller.php`
  - the common case), use the array form of `controller`: `['<id>' => '<id>/v1']` (key = URL name, value = the
  actual route) - a bare string works only when the public path and the controller route are identical.
  `extraPatterns` are **verb-agnostic** (`'<path>' => '<action>'`, never `'POST <path>' => ...`): the controller's
  own `verbs()` (via `yii\rest\Controller`'s default `behaviors()`, `VerbFilter`) is where verb enforcement belongs -
  a verb-restricted URL pattern 404s every other verb at the routing layer, before the request ever reaches
  `VerbFilter`, instead of its correct `405`. Also local DI bindings. Verify after generating: a wrong verb on the
  module's endpoint answers `405`, not `404`.

## B.4 Checks (per layer, must print nothing unless noted)
```bash
# domain stays pure PHP - no Yii at all, not even the queue contracts (the job lives in infrastructure/queue/)
grep -rnE 'Yii::|use yii[\]|extends (ActiveRecord|Model|Component|BaseObject)|[\]infrastructure[\]' emulator/modules/<id>/domain
# application may use only the queue contracts (push/JobInterface), nothing else Yii, no ActiveRecord, no infrastructure
grep -rnE 'Yii::\$app->(?!queue)|use yii\\(?!queue\\)|extends (ActiveRecord|Model|Component|BaseObject)|[\]infrastructure[\]' emulator/modules/<id>/application
grep -rln "extends ActiveRecord" emulator/modules/<id> --include=*.php | grep -v "/infrastructure/"
# no migration expected for this module (reuses Part A's emulator_process) - this must report "0 new migrations"
MSYS_NO_PATHCONV=1 docker compose exec -T -w /app/emulator php-cli php yii migrate --interactive=0
```
- Every `EMU-n` of `module.service.md` §9 maps to a concrete, testable piece of the generated code (name it in the report).
- The callback (when the method has one) is never sent from the request that produced it: the use case only pushes
  `<Method>CallbackJob` with a 5-second delay; only the job (run by `emulator-queue-worker`) calls
  `HttpCallbackSender`, and only to the `callback_url` carried in the job's payload, never a hard-coded one.
- `http://emulator.dev:81/<id>/...` resolves per `service_methods[].remote_request.path`; an invalid body answers per
  EMU-2 (state the actual status used, since it's an open point unless the specs define it).
- `docker compose logs emulator-queue-worker` shows the job class being picked up and executed roughly 5 seconds after
  a manual init request (spot-check, not a substitute for B.5's automated tests).

## B.5 Register and verify
1. `emulator/config/web.php`: add `'<id>' => ['class' => \app\modules\<id>\Module::class]` to `modules` and `'<id>'` to
   `bootstrap` (minimal `Edit`).
2. **`emulator/config/console.php` too, for any module with a `callback` block** (its `CallbackJob` runs inside
   `emulator-queue-worker`, a **console** app, never `web.php`): add the SAME `'<id>' => [...]` entry to `modules` and
   `'<id>'` to `bootstrap` - `Module::bootstrap()` must guard its URL-rule code with
   `if ($app instanceof \yii\web\Application)` so it runs safely from a console app too (console has no `urlManager`),
   while its DI bindings (`Yii::$container->setSingleton(...)`) apply in both. Also confirm
   `container.singletons.\app\domain\process\EmulatorProcessRepository` exists in `console.php` (add it, mirroring
   `web.php`, if Part A never did - a real gap found generating the first module: without it every queue job crashes
   with `NotInstantiableException`). Add `'app\modules\<id>\migrations'` to
   `controllerMap.migrate.migrationNamespaces` only if this module ever gets a migration of its own (history stays
   `emulator_migration`, unchanged).
3. Unit tests (fakes, no database):
   ```bash
   MSYS_NO_PATHCONV=1 docker compose exec -T -w /app/emulator php-cli sh -c 'vendor/bin/codecept build >/dev/null; vendor/bin/codecept run Unit --no-colors'
   ```
   All green; report real counts (emulator host + this module).
4. All B.4 checks again; `http://emulator.dev:81/` still answers 404 from Yii for unrelated paths.

## B.6 Independent review
Run skill **`design-review`** in a separate pass (fresh subagent). Fix errors; fix or justify warnings; re-check. A fix
that changes documented behaviour updates `module.service.md` in the same step - report the change.

## B.7 Report
Module id and specs used; files generated/kept/differing per layer; migration applied and the table; queue
infrastructure reused (already set up and confirmed working - B.1); wiring edits;
check and test results; review verdict; which `EMU-n` requirements are covered by what; open points carried over
(scenario selection, signature algorithm, callback response body, CLAUDE.md's still-undecided items); the next step.

## B.8 Stage 3 - test the module
Module creation is not done until the module is tested end to end.
- **Run by `create-module`** (the normal pipeline, its §3.6): do nothing here - `create-module` runs `test-module`
  itself right after this part; never start a second run.
- **Run on its own** (Part B called directly): if `demo/modules/<id>/` exists, run skill **`test-module`** for `<id>`
  now - it builds/updates `development/test/<id>/module_<id>.md`, executes it live against both apps (callback rows
  take ≥5s) and loops with `fix-code` (max 5 iterations); append its outcome (clean, or N rows open with their
  backlog files) to this report. If `demo/modules/<id>/` does not exist, say so and stop - do not run `test-module`
  against a half-built module.

## B Rules
- `module.service.yaml`/`module.service.md` are the source of truth for data and required behaviour; project rules are
  the source of truth for code structure. A conflict is asked, not resolved silently.
- Never overwrite an existing file without consent; never edit `vendor/`; never touch `demo/` or another module.
- No new Composer dependency without approval - `yiisoft/yii2-queue` + `enqueue/amqp-lib` are pre-approved (B.1) for the
  queue itself; anything beyond those two still needs asking. The callback HTTP send stays curl (no new dependency).
- The delay is always 5 seconds via the TTL + dead-letter-exchange mechanism (no RabbitMQ plugin) - never the plugin
  path, never a different duration, never an inline/synchronous send.
- Scenario selection, the signature algorithm, and anything else CLAUDE.md lists as undecided are never invented here -
  record them as open in the report.
- The callback is always sent (by the job, never the use case) to the `callback_url` received in the request, never a
  configured/guessed URL.
