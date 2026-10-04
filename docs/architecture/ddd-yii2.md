# DDD with Yii2

How to apply Domain-Driven Design in Yii2 code of this project. General rules (SOLID, layers, building blocks,
ubiquitous language): [code-design.md](code-design.md). This document covers only what is specific to Yii2.

Sources:
- Yii forum, "DDD in Yii2": https://forum.yiiframework.com/t/ddd-in-yii2/83456
- `php-kitchen/yii2-domain`: https://github.com/php-kitchen/yii2-domain, https://packagist.org/packages/php-kitchen/yii2-domain
- `albertborsos/yii2-ddd`: https://packagist.org/packages/albertborsos/yii2-ddd
- Yii2 guide / API: https://www.yiiframework.com/doc/guide/2.0/en/db-dao, https://www.yiiframework.com/doc/api/2.0/yii
  (Yii2 facts: the `yii2-*` skills and the official guide only, see `AGENTS.md`).

The packages above are listed for reference only; they are **not** project dependencies (adding one needs the user's approval).

## 1. The problem

Yii2 is built around **Active Record**: one AR class holds data access, validation and business logic together. DDD needs the
business logic (the domain layer) to be independent of the database and the framework. The two collide unless the
framework is kept at the edge.

**Principle:** Yii2 is the **delivery and infrastructure mechanism** - it runs HTTP and CLI, routes requests, wires
dependencies and talks to the database. It is not the centre of the application. The domain and application layers are plain
PHP that would work without Yii.

## 2. Rules

### 2.1 Active Record is not the domain
- Domain entities and value objects are **plain PHP objects** (POPOs). They never extend `yii\db\ActiveRecord`,
  `yii\base\Model`, `yii\base\Component` or `yii\base\BaseObject`, and never use behaviors or Yii events.
- ActiveRecord classes live in `infrastructure/` and are used only as **persistence models** (row DTOs / data mappers):
  table name, attributes, relations for loading, `TimestampBehavior` and similar persistence details.
- No business logic in AR classes: no status transitions, no rules of the process, no remote-service calls.
- AR `rules()` describe only what the table can store (types, lengths); business invariants are checked in the domain
  (value-object constructors, entity methods).

### 2.2 Repositories hide ActiveRecord
- The **repository interface** is in `domain/`, collection-like, and speaks domain types only: `get(ExternalId): Payment`,
  `save(Payment): void`.
- The **implementation** is in `infrastructure/` and uses AR queries (`find()->where([...])`, hash format with bound
  parameters - see `yii2-data-layer`) and maps AR ↔ entity in both directions (a small mapper class if the mapping is not trivial).
- AR objects, `ActiveQuery` and raw rows never leave the repository implementation.
- Relations (`hasMany`/`hasOne`) are used inside the repository to load the whole aggregate; the domain navigates its own
  object graph, never AR relations.

### 2.3 Thin controllers, logic in application services
- A controller only: takes the request data, converts it into a command (value objects), calls one application service, and
  converts the result into the response. In modules this happens inside the three `BaseController` methods
  (`doProcess()`, `getExternalId()`, `getCallbackStatus()`), because `BaseController` already reads the request.
- **Application services** coordinate domain objects, repositories and the remote client and carry out the use case.
  They never read `Yii::$app->request`, never build `Yii::$app->response`, never throw `yii\web\HttpException` - they
  return a result object or throw a domain/application exception that the controller translates to HTTP.

### 2.4 No service locator in the domain and application layers
- Never use `Yii::$app->db`, `Yii::$app->user`, `Yii::$app->request`, `Yii::$app->params`, `Yii::$app->get(...)` or
  `Yii::createObject()` in `domain/` or `application/`. `Yii::$app` is allowed only in controllers, `Bootstrap` and, where
  unavoidable, infrastructure.
- Dependencies are injected **through constructors** by the Yii DI container (`yii\di\Container`): interfaces owned by
  domain/application, implementations from infrastructure.
- **Controllers too.** Yii creates controllers through the container, so a controller receives its application services in
  the constructor: `__construct($id, $module, HandleCallback $handleCallback, $config = [])` - dependencies between
  `$module` and `$config`, then `parent::__construct($id, $module, $config)` (guide: concept-di-container). No
  `Yii::$container->get()` / `Yii::createObject()` inside controller methods.
- **One exception - the host's abstract `BaseController`:** it receives `ProcessService` by **action-parameter injection**
  (`actionInit(ProcessService $processes)`, Yii 2.0.36+), so that module controllers do not have to repeat its dependency in
  their own constructors. This is still container injection (not a service locator); the type must be registered in the
  container (`yii2-fundamentals`). Do not "fix" it to constructor injection (`generate-api` spec 04).
- Bindings are registered in the module's **`bootstrap()`** (`Module` implements `BootstrapInterface` and is listed in the
  app's `bootstrap` - the composition root), e.g.
  `Yii::$container->setSingleton(PaymentRepository::class, ArPaymentRepository::class);`
  (`setSingleton()` for stateless services and repositories, `set()` when a new instance is needed each time -
  `yii2-fundamentals`). Host bindings stay in `config/web.php` `container`.
- Configuration values (URLs of the remote service, timeouts) are injected as constructor arguments or a small config value
  object, not read from `Yii::$app->params` inside the class.

### 2.5 Other framework features
| Yii2 feature | Where it may be used |
|--------------|----------------------|
| `yii\db\Connection`, transactions | infrastructure only. The application service needs a transaction boundary through an interface it owns (e.g. `TransactionRunner::run(callable)`), implemented in infrastructure with the connection's transaction support. |
| Yii events, behaviors | infrastructure (e.g. dispatching a domain event object after `save`), never in domain objects |
| `yii\base\Model` validation | the delivery edge (checking the shape of input), not domain rules |
| `Yii::t()`, logging `Yii::info()` | controllers and infrastructure; the domain throws exceptions with codes/messages, the edge logs and translates |
| HTTP client for the remote service | infrastructure (anti-corruption layer), behind an interface |
| Migrations | infrastructure concern of the module (`migrations/`), AGENTS.md rule 7 |

## 3. Example (one use case, all layers)

```php
// domain/ - plain PHP
final readonly class ExternalId
{
    public function __construct(public string $value)
    {
        if ($value === '') {
            throw new InvalidExternalId('External id must not be empty.');
        }
    }
}

interface PaymentRepository
{
    public function getByExternalId(ExternalId $id): Payment;
    public function save(Payment $payment): void;
}

// application/ - no Yii
final class HandleCallback
{
    public function __construct(
        private readonly PaymentRepository $payments,
        private readonly CallbackStatusMapper $statuses,
    ) {}

    public function handle(CallbackCommand $command): Status
    {
        $payment = $this->payments->getByExternalId($command->externalId);
        $payment->complete($this->statuses->map($command->remoteStatus));   // invariant checked in the entity
        $this->payments->save($payment);
        return $payment->status();
    }
}

// infrastructure/ - Yii lives here
final class ArPaymentRepository implements PaymentRepository
{
    public function getByExternalId(ExternalId $id): Payment
    {
        $row = PaymentRecord::findOne(['external_id' => $id->value]);   // PaymentRecord extends ActiveRecord
        if ($row === null) {
            throw new PaymentNotFound($id);
        }
        return PaymentMapper::toDomain($row);
    }

    public function save(Payment $payment): void { /* map to PaymentRecord and save() */ }
}

// Module.php (demo/modules/<id>/) - composition root: bootstrap() runs because the module is in the app's `bootstrap`
public function bootstrap($app): void
{
    Yii::$container->setSingleton(PaymentRepository::class, ArPaymentRepository::class);
    // ... and the module's URL rules (GroupUrlRule)
}

// controllers/V1Controller.php - thin; the use case comes through the constructor (Yii creates controllers via the container)
final class V1Controller extends BaseController
{
    public function __construct(
        $id,
        $module,
        private readonly HandleCallback $handleCallback,
        $config = [],
    ) {
        parent::__construct($id, $module, $config);
    }

    public function getCallbackStatus(array $data): string
    {
        return $this->handleCallback->handle(CallbackCommand::fromPayload($data))->value;
    }

    // doProcess() and getExternalId() follow the same pattern
}
```

Names are illustrative; use the module's ubiquitous language. `HandleCallback` is a concrete class, so the container builds it
for **constructor** injection without a binding (action-parameter injection, in contrast, resolves only registered types - see
`yii2-fundamentals`); its own dependencies (`PaymentRepository`, `CallbackStatusMapper`) must be bound in `Bootstrap`, otherwise the
controller fails with "cannot be instantiated". Constructor injection into controllers and binding with
`Yii::$container->setSingleton()` (one shared instance) / `set()` (new instance on every resolve) are documented in the guide
(concept-di-container) and confirmed for this project.

## 4. Anti-patterns

- An entity that extends `ActiveRecord` or `Model`, or a "domain service" that calls `SomeRecord::find()`.
- `Yii::$app->...` anywhere in `domain/` or `application/`.
- Business rules in AR `rules()`, `beforeSave()`, behaviors or event handlers.
- A repository that returns AR objects or `ActiveQuery`.
- Fat controllers: status mapping, remote calls or persistence in a controller.
- Application services that know about HTTP (request, response, status codes, `HttpException`).

## 5. Checks (`<module>` = `demo/modules/<id>` or `emulator/modules/<id>`)

```bash
# domain/ and application/ must not touch Yii
grep -rnE 'Yii::|use yii[\]|extends (ActiveRecord|Model|Component|BaseObject)|[\]infrastructure[\]' <module>/domain <module>/application
# ActiveRecord only in infrastructure/
grep -rln "extends ActiveRecord" <module> | grep -v "/infrastructure/"
```
Both commands must print nothing. The `design-review` skill runs these checks.
