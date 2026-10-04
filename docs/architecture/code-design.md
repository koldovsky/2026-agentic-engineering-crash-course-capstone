# Code design: SOLID and Domain-Driven Design

Rules for all code written or generated in this project (host `demo/`, emulator `emulator/`, modules in
`demo/modules/<id>/` and `emulator/modules/<id>/`). The agent skills that apply them are listed in section 7.

Sources (paraphrased, adapted to this project):
- Design principles: https://www.designgurus.io/blog/essential-software-design-principles-you-should-know-before-the-interview
- Domain-Driven Design: https://www.designgurus.io/answers/detail/how-to-understand-domain-driven-design-for-system-design-interviews
- Yii2 facts only from the official guide (see `AGENTS.md`).

Yii2-specific rules (ActiveRecord, controllers, `Yii::$app`, DI container): [ddd-yii2.md](ddd-yii2.md).

The rules below do not replace the "Module architecture" rules in `AGENTS.md` (module inside the application, registration,
`BaseController` contract, migrations). They add structure inside that frame.

## 1. Where each approach applies

| Code | SOLID | DDD layers |
|------|-------|------------|
| Module (`demo/modules/<id>/`, `emulator/modules/<id>/`) | always | **yes** - one bounded context per module (section 4) |
| Host (`demo/`) | always | minimal - only the process tracking (`Process` entity, repository, AR persistence model, `ProcessService`) and `BaseController` |
| Emulator (`emulator/`) | always | minimal - `EmulatorProcess` the same way; more only when an emulated service gets real logic |

Simplicity wins over ceremony (KISS, YAGNI): a layer, interface or class is added only when it has a job now.

## 2. SOLID

| Principle | Rule here | Symptom of a violation | Typical fix |
|-----------|-----------|------------------------|-------------|
| **S** - Single responsibility | A class has one reason to change. Controllers only translate HTTP ↔ application calls; mapping remote statuses, building the remote request, sending it and saving data are separate classes. | A class mixes HTTP, persistence, remote calls and status mapping; unrelated changes touch the same file. | Split by concern: use case, status mapper, remote client, repository. |
| **O** - Open/closed | New behaviour is added by new classes, not by editing a growing `switch`/`if` chain. | Every new `service_method` or remote status adds another branch in an existing method. | One handler/strategy per service method behind an interface; register it in the module's `bootstrap()`. |
| **L** - Liskov substitution | Every implementation honours its interface's contract (types, allowed values, exceptions, no "not supported" throws). A module controller honours the `BaseController` contract. | An implementation throws for a method it "doesn't support", narrows accepted input or returns a status outside `success`/`process`/`fail`. | Narrow the interface (ISP) or fix the hierarchy; return only contract values. |
| **I** - Interface segregation | Small interfaces shaped by their client. | A class implements methods it leaves empty; an interface mixes reading, writing and remote calls. | Split: e.g. `ProcessReader` / `ProcessWriter`, `RemoteServiceClient` separate from `StatusMapper`. |
| **D** - Dependency inversion | Domain and application code depend on interfaces they own; infrastructure implements them. Dependencies arrive through the constructor (Yii DI container), never through `new` of infrastructure classes or `Yii::$app` calls inside domain/application code. | A use case calls `new HttpClient()`, `SomeRecord::find()` or `Yii::$app->db`; it cannot be unit-tested without the database or network. | Put an interface in the domain/application layer, the implementation in infrastructure, and bind them in the module's `bootstrap()`. |

Supporting principles:
- **DRY** - one place for each piece of knowledge (e.g. the status map of a service method lives in one mapper). Do not
  merge code that only *looks* alike but changes for different reasons.
- **KISS** - the most direct solution that meets the requirement; no abstraction without a second use or a test need.
- **YAGNI** - implement only what the current request needs (`init` and `callback` first); no speculative options, hooks or
  generic frameworks.
- **Composition over inheritance** - reuse through injected collaborators. Inheritance only for a true "is-a" (the module
  controller *is a* `BaseController`); no deep hierarchies.
- **Law of Demeter** - talk to direct collaborators only; no chains like `$a->getB()->getC()->do()`. Ask the object that owns
  the data to do the work.

## 3. Ubiquitous language

Use these terms, with exactly these meanings, in code (class/method names), docs, tests and conversations. New terms of a
module go into its README glossary.

| Term | Meaning |
|------|---------|
| Process | one run of a request to a remote service, tracked by the host in table `process` |
| Request id (`requestId`) | the client's id of the process; unique |
| Service method (`service_method`) | the operation of a remote service the client asks for |
| Init | the first request: the module sends the service request; the answer is mapped to a status |
| Callback | the later request of the remote service reporting the result |
| External id | the remote service's own id of the process (`external_id`); used to find the process on callback |
| Status | our process status: `success` (finished), `process` (running), `fail` (the service reported a failure) - mapped by the module; `init` (recorded, the remote service has not answered yet) and `error` (our processing failed) - set only by the host |
| Service | a remote service the API works with, listed in table `service`; its name is the id of the module that integrates it |
| Remote status | the service's own status value(s), mapped to Status by the module |
| Remote service | the external system a module integrates; in tests replaced by the emulator |

## 4. DDD in a module

### Strategic design
- **Bounded context = module.** Each module models one remote service. Its terms (e.g. the service's "transaction" or
  "order") are valid only inside it; they never leak into the host or into another module.
- **Shared kernel = the host contract.** The request body `{"requestId", "service_method", "data"}`, the `Process` record and
  the Status model (five values: `init`, `success`, `process`, `fail`, `error`; modules map to the three middle ones) are shared by all modules and changed only in the host.
- **Anti-corruption layer = the remote-service adapter.** The remote service's model (its request/response fields, complex
  statuses) is translated at the module's infrastructure boundary. The domain and application layers see only our terms:
  the remote client returns a module-side result, and a status mapper turns remote statuses into Status.
- **Context map** (documented in the module README): host → module (conformist: the module implements the `BaseController`
  contract as given); module → remote service (via the anti-corruption layer); emulator plays the remote service in tests.
- Core vs supporting: the process flow and status mapping are the core; persistence and HTTP are supporting details.

### Layers and module layout

```text
demo/modules/<id>/                   namespace app\modules\<id> (the emulated service: emulator/modules/<id>/)
        Module.php               composition root: bootstrap() adds the URL rules and the DI bindings (interface -> implementation)
        controllers/             interface layer: V1Controller (implements only the 3 BaseController methods, delegates)
        application/             use cases (one class per service method / callback), commands and results (DTOs)
        domain/                  pure PHP, no Yii/HTTP/DB: entities, value objects, aggregates, repository interfaces,
                                 domain services, domain events, domain exceptions
        infrastructure/          Yii-specific: ActiveRecord classes, repository implementations, remote-service client
                                 (anti-corruption layer), status mappers of remote statuses
        migrations/              namespaced migrations (AGENTS.md rules)
demo/tests/Unit/modules/<id>/        domain and application (fakes for repository/client interfaces)
functional tests                     through the API against the emulator
```

**Dependency rule:** `controllers` → `application` → `domain` ← `infrastructure`. The domain depends on nothing; application
depends on the domain only; infrastructure implements domain/application interfaces; only `Module::bootstrap()` and controllers know
concrete classes. `models/` from the default layout is replaced by `domain/` + `infrastructure/`.

### Building blocks

| Block | Use it for | Rules |
|-------|------------|-------|
| **Value object** | a value without identity: `RequestId`, `ExternalId`, `ServiceMethod`, money, address, a remote status value | immutable (`readonly`), validated in the constructor, compared by value; prefer value objects over raw strings/arrays |
| **Status** | our statuses | a PHP `enum` (`init`, `success`, `process`, `fail`, `error`) in the host; modules map remote statuses only to `success`, `process`, `fail` |
| **Entity** | something with identity whose state changes over time | identity by id; behaviour methods instead of public setters; invariants checked inside |
| **Aggregate / root** | a cluster changed as one unit | outside code talks only to the root; one repository per aggregate; one aggregate per transaction; small |
| **Repository** | loading/saving an aggregate | interface in `domain/`, collection-like (`get`, `save`); implementation with ActiveRecord in `infrastructure/`; never returns ActiveRecord objects to the domain |
| **Domain service** | domain logic that belongs to no single entity (e.g. choosing the status transition from a callback) | stateless, named in the ubiquitous language |
| **Application service (use case)** | one workflow: init of a service method, handling a callback | orchestrates domain objects, repositories and the remote client; transaction boundary; no business rules of its own |
| **Domain event** | an important state change another part must react to | past-tense name (`ProcessCompleted`); add only when there is a consumer (YAGNI); can be dispatched with Yii events from infrastructure |
| **Factory** | complex creation of an aggregate or value object | only when a constructor is not enough |

### The `BaseController` boundary
The host passes `Process` (the host's domain entity `app\domain\process\Process`, part of the shared kernel - not
ActiveRecord) and raw `array $data` to the module controller. The controller:
1. converts them into application commands made of the module's value objects (request id, service method, the validated
   `data`);
2. calls the use case;
3. applies the result to the host entity through its methods (`$process->assignExternalId(...)`,
   `$process->changeStatus(...)`) and returns what the contract expects (`array` from `doProcess()`, `string` from
   `getExternalId()`, one of `success|process|fail` from `getCallbackStatus()`). The host saves the entity.

The host's `Process`, ActiveRecord objects and `Yii::$app` never cross into the module's `application/` or `domain/`.

## 5. Tests

- Domain: plain unit tests, no database, no Yii application.
- Application: unit tests with in-memory fakes of the repository and remote-client interfaces (possible because of DIP).
- Integration/functional: through the API against the emulator, covering every success, fail and error path (`flow.md`).
- Run with `vendor/bin/phpunit` inside `php-cli` (AGENTS.md "Commands").
- Static analysis (types, reachability, nullability - a different check than the rules above): PHPStan,
  [static-analysis.md](static-analysis.md), skill `phpstan`.

## 6. Pitfalls to avoid

- Anemic model: entities with only getters/setters and all rules in services.
- Leaking models across boundaries: remote-service fields or ActiveRecord objects inside the domain; one module's classes used by another.
- Mixed vocabulary: two names for one concept, or one name for two concepts (see section 3).
- Over-engineering: layers, interfaces, events or factories without a current job; generic "frameworks" for one use.
- Big aggregates and transactions spanning several aggregates.
- Chains that walk object graphs (Law of Demeter) and `new` of infrastructure classes in domain/application code.

## 7. Skills

| Skill | Use |
|-------|-----|
| `solid-principles` | reference and checklist for writing or reviewing any PHP class by SOLID + DRY/KISS/YAGNI/composition/Demeter |
| `ddd-architecture` | modelling a module: bounded context, ubiquitous language, layers, building blocks, the `BaseController` boundary |
| `code-generation` | the procedure for generating code: model → layers → write → test → self-check with both checklists |
| `design-review` | read-only review of existing or generated code against these rules (a separate checker pass) |
| `phpstan` | static analysis (types, reachability, nullability) - independent of design-review, see section 5 |
| `analyze-code` | runs `design-review` + `phpstan` together, writes one combined checkbox report to `development/` |
| `fix-code` | fixes a checklist report's problems (`analyze-code`'s static findings or `test-module`'s live flow results), re-checks in a loop (max 5 iterations), tracks remaining/resolved problems in `development/backlog/`/`development/complete/` |
| `test-module` | runs a module's full flow (init, callback, status changes, every final status/error) live against the stack per its `module.tests.md`, loops with `fix-code` (max 5 iterations) |
