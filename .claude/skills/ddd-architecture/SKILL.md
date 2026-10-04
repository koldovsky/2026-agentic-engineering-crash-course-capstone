---
name: ddd-architecture
description: Domain-Driven Design for this project's Yii2 modules - bounded context per module, ubiquitous language, anti-corruption layer for the remote service, layers (controllers/application/domain/infrastructure) and building blocks (value objects, entities, aggregates, repositories, domain/application services, domain events) mapped onto the module layout inside the application (demo/modules/<id>, emulator/modules/<id>) and the BaseController contract. Use when designing a new module, adding a service method or callback, or deciding where a class belongs.
---

# Domain-Driven Design in a module

Project rules: `docs/architecture/code-design.md` §1, §3, §4 and `docs/architecture/ddd-yii2.md` (Yii2 specifics: ActiveRecord
only as persistence model, thin controllers, DI instead of `Yii::$app`) - source of truth; keep this skill consistent with them. The
frame from `AGENTS.md` "Module architecture" (module inside the application, registration, `BaseController` contract, migrations) always
applies. Write every class by the `solid-principles` skill.

Scope: full DDD layers are used in **modules**. The host `demo/` has only the process tracking (`Process` entity, repository,
AR persistence model, `ProcessService`) and `BaseController` (skill `init-api`); the emulator has `EmulatorProcess` the same way
(skill `init-emulator`) and more layers only when an emulated service gets real logic.

## 1. Strategic design - do this first, before any code
1. **Name the bounded context**: the module = one remote service. Write 2-3 sentences of what it does in business terms.
2. **Ubiquitous language**: start from the project glossary (`code-design.md` §3: Process, Request id, Service method, Init,
   Callback, External id, Status, Remote status, Remote service) and add the module's own terms with one-line meanings.
   One term per concept, one concept per term; use them verbatim in class, method and test names. Put the glossary in the
   module README.
3. **Context map** (module README): host → module is *conformist* (the module implements the `BaseController` contract as
   given); module → remote service goes through an **anti-corruption layer**; the emulator stands in for the service in tests.
   Nothing from another module is used.
4. **Core vs supporting**: the process flow and status mapping are core; persistence and HTTP are supporting details.
Ask the user when a term, a status meaning or a service rule is unclear - never invent business rules.

## 2. Layers and layout
The module lives in the application: `demo/modules/<id>/` (the emulated service in `emulator/modules/<id>/`), namespace
`app\modules\<id>`; the module id is `[a-z][a-z0-9_]*` (also the URL prefix and the service name).
```text
demo/modules/<id>/
    Module.php           extends yii\base\Module, implements BootstrapInterface - composition root: bootstrap() adds the
                         URL rules and the DI bindings interface -> implementation
    controllers/         V1Controller: only the 3 BaseController methods; converts in/out and delegates to application
    application/         use cases (one per service method init / per callback kind), commands, results
    domain/              pure PHP: value objects, Status enum, entities, aggregates, repository interfaces,
                         domain services, domain events, domain exceptions
    infrastructure/      ActiveRecord classes, repository implementations, remote-service client (anti-corruption
                         layer), status mappers, event dispatch through Yii events
    migrations/          the module's tables + M<YYMMDDHHMMSS>RegisterService (see below)
demo/tests/Unit/modules/<id>/  (domain, application with fakes)   functional tests (API against the emulator)
```
Registration: `config/web.php` `modules` + `bootstrap`, `config/console.php` `migrationNamespaces`
(`app\modules\<id>\migrations`).
**Service registration:** the module's `RegisterService` migration inserts its row into the host's table `service`
(`name` = the module id, `created_at`, `updated_at`) and deletes it in `safeDown()`; the host resolves the service of every
init/callback from the module id, and external ids are unique per service (`AGENTS.md` "Module architecture").
Namespaces follow the directories under the module (`app\modules\<id>\domain\...`, lowercase like Yii's `controllers`,
`models`).

**Dependency rule** - check it for every `use` statement:

| Layer | May depend on | Must not depend on |
|-------|---------------|--------------------|
| `domain` | PHP only (and other domain classes) | Yii, ActiveRecord, HTTP, `application`, `infrastructure`, `controllers` |
| `application` | `domain` | Yii, ActiveRecord, `infrastructure`, `controllers` |
| `infrastructure` | `domain`, `application` (interfaces it implements), Yii | `controllers` |
| `controllers` | `application`, `domain` value objects, the host contract (`BaseController`, `Process`) | ActiveRecord of the module, remote client |
| `Module::bootstrap()` | everything (it wires the graph) | - |

## 3. Building blocks - where things go

| You need... | Build | Layer | Rules |
|-------------|-------|-------|-------|
| a validated value without identity (`RequestId`, `ExternalId`, `ServiceMethod`, amount, remote status value) | value object | domain | `final readonly`, validates in constructor, `equals()`, no setters |
| our statuses | the host's `enum Status` (`success`, `process`, `fail`, `error`) | host domain | a module maps remote statuses only to `success`/`process`/`fail`; `error` is set only by the host when `doProcess()` throws; a callback status that differs always replaces the current one (`flow.md` §3) |
| a thing with identity and changing state | entity | domain | id-based identity, behaviour methods that protect invariants, no public setters |
| a cluster changed together | aggregate with a root | domain | only the root is referenced from outside; keep it small; one aggregate per transaction |
| load/save an aggregate | repository interface | domain | collection-like: `get(Id)`, `find...()`, `save(Aggregate)`; returns domain objects only |
| the ActiveRecord behind it | repository implementation + AR class | infrastructure | maps AR ↔ domain; AR never leaves infrastructure |
| call the remote service | client interface (domain/application) + HTTP implementation | infrastructure | **anti-corruption layer**: translate the service's fields and errors into module terms |
| remote status → Status | status mapper | infrastructure (map is service knowledge) | one mapper per service method/direction; unknown values → explicit default or an error, never silent |
| logic spanning several objects | domain service | domain | stateless, ubiquitous-language name |
| one workflow (init X, handle callback) | application service (use case) | application | orchestrates; transaction boundary; no business rules of its own |
| react to a state change elsewhere | domain event (`ProcessCompleted`) | domain (event), infrastructure (dispatch) | only when a consumer exists (YAGNI) |
| complex creation | factory | domain | only if a constructor is not enough |

## 4. The `BaseController` boundary
`BaseController` passes the host's `Process` - the domain entity `app\domain\process\Process` (shared kernel, not
ActiveRecord) - and raw `array $data`. In `V1Controller`:
1. `doProcess(string $type, Process $process, array $data): array` - build a command from the module's value objects (values
   read from the entity's getters and the validated data), call the use case, apply the result to the entity
   (`assignExternalId()`, `changeStatus()`; the host saves it), return the array the contract expects.
2. `getExternalId(array $data): string` - ask the anti-corruption layer where the service put its id; return the string.
3. `getCallbackStatus(array $data): string` - let the use case/mapper decide; return `Status->value`.
The use cases come into `V1Controller` through its constructor (`__construct($id, $module, <use cases>, $config = [])`, then
`parent::__construct($id, $module, $config)`; see `docs/architecture/ddd-yii2.md`), never via `Yii::$container->get()`.
Controllers hold no business rules and no remote-service knowledge. `Process` and `Yii::$app` never go deeper than the controller.

## 5. Design output (before code)
Produce and show the user, briefly:
- bounded context summary and glossary additions;
- list of classes per layer with one-line responsibilities;
- the aggregate(s), their invariants and their repository;
- the anti-corruption layer: remote fields → module terms, remote statuses → Status per service method;
- open questions.
Then generate code with the `code-generation` skill.

## Pitfalls
Anemic entities; ActiveRecord or remote payload arrays inside the domain; two names for one concept; big aggregates;
transactions across aggregates; layers/events/factories without a current job; classes of one module used by another.
